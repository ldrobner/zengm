import { Dropdown } from "react-bootstrap";
import { Flag } from "../WatchBlock";
import {
	confirm,
	helpers,
	logEvent,
	realtimeUpdate,
	toWorker,
	useLocalPartial,
} from "../../util";
import {
	useCallback,
	useEffect,
	useState,
	type ReactNode,
	type RefObject,
} from "react";
import type { SelectedRows } from "./useBulkSelectRows";
import { watchListDialog } from "./watchListDialog";
import { exportPlayers } from "../../views/ExportPlayers";
import { createPortal } from "react-dom";
import Modal from "../Modal";
import type { DataTableRowMetadata, Props } from ".";
import clsx from "clsx";

// Even at 20 the UI is kind of silly, and if you put in too many players it gets slow/crashes
const MAX_NUM_TO_COMPARE = 20;

type ExportModalStatus =
	| {
			show: false;
			abortController?: undefined;
	  }
	| {
			show: true;
			abortController: AbortController;
	  };

const ExportModal = ({ abortController, show }: ExportModalStatus) => {
	return (
		<>
			{show &&
				createPortal(
					<Modal animation show={show}>
						<Modal.Body>
							<h3 className="mb-0">Exporting players...</h3>
						</Modal.Body>

						<Modal.Footer>
							<button
								className="btn btn-danger"
								onClick={() => {
									abortController?.abort();
								}}
							>
								Cancel
							</button>
						</Modal.Footer>
					</Modal>,
					document.body,
				)}
		</>
	);
};

const getSeason = (
	season: DataTableRowMetadata["season"],
	type: "compare" | "export",
) => {
	if (typeof season === "string" || typeof season === "number") {
		return season;
	}

	return season[type] ?? season.default;
};

export const BulkActions = ({
	hideAllControls,
	name,
	selectedRows,
	wrapperRef,
}: {
	hideAllControls?: Props["hideAllControls"];
	name: string;
	selectedRows: SelectedRows;
	wrapperRef: RefObject<HTMLDivElement | null>;
}) => {
	const { godMode, numWatchColors } = useLocalPartial([
		"godMode",
		"numWatchColors",
	]);
	const [nextWatch, setNextWatch] = useState<undefined | number>(undefined);
	const [exportModalStatus, setExportModalStatus] = useState<ExportModalStatus>(
		{
			show: false,
		},
	);

	const hideAllControlsHasTitle =
		hideAllControls !== undefined && typeof hideAllControls !== "boolean";

	const getUpdatedShowInlineButtons = useCallback(() => {
		// Never show inline if there's a title, because there's no room!
		if (hideAllControlsHasTitle || !wrapperRef.current) {
			return false;
		}

		// Cutoff for when there is enough room to show inline buttons
		return wrapperRef.current.offsetWidth >= 750;
	}, [hideAllControlsHasTitle, wrapperRef]);

	const [showInlineButtons, setShowInlineButtons] = useState(false);

	useEffect(() => {
		if (wrapperRef.current) {
			getUpdatedShowInlineButtons();

			const update = () => {
				setShowInlineButtons(getUpdatedShowInlineButtons);
			};

			const resizeObserver = new ResizeObserver(update);
			resizeObserver.observe(wrapperRef.current);

			return () => {
				resizeObserver.disconnect();
			};
		}
	}, [getUpdatedShowInlineButtons, wrapperRef]);

	const hasSomeSelected = selectedRows.map.size > 0;

	const onComparePlayers = async () => {
		const seasonTypes = {
			combined: "c",
			playoffs: "p",
			regularSeason: "r",
		};
		const players = Array.from(selectedRows.map.values())
			.slice(0, MAX_NUM_TO_COMPARE)
			.map(metadata => {
				return `${metadata.pid}-${getSeason(metadata.season, "compare")}-${seasonTypes[metadata.playoffs]}`;
			});

		await realtimeUpdate(
			[],
			helpers.leagueUrl(["compare_players", players.join(",")]),
		);
	};

	const onExportPlayers = async () => {
		const seasonsByPids = new Map<number, number | "latest">();
		let duplicatePids = false;
		for (const metadata of selectedRows.map.values()) {
			const seasonRaw = getSeason(metadata.season, "export");

			// Exported player must be at a specific season, so use latest season if career is specified
			const season = seasonRaw === "career" ? "latest" : seasonRaw;

			const prev = seasonsByPids.get(metadata.pid);
			if (prev !== undefined) {
				duplicatePids = true;
				if (prev === "latest" || (season !== "latest" && season < prev)) {
					continue;
				}
			}

			seasonsByPids.set(metadata.pid, season);
		}

		if (duplicatePids) {
			logEvent({
				type: "error",
				text: "Exporting the same player from multiple seasons is not supported, only the latest season will be exported.",
				saveToDb: false,
			});
		}

		const abortController = new AbortController();
		abortController.signal.addEventListener(
			"abort",
			() => {
				setExportModalStatus({
					show: false,
				});
			},
			{ once: true },
		);

		setExportModalStatus({
			show: true,
			abortController,
		});

		try {
			await exportPlayers(seasonsByPids, abortController.signal);
		} catch (error) {
			logEvent({
				type: "error",
				text: error.message,
				saveToDb: false,
			});
		}

		setExportModalStatus({
			show: false,
		});
	};

	const onWatchPlayers = async () => {
		const pids = Array.from(selectedRows.map.values()).map(metadata => {
			return metadata.pid;
		});

		if (numWatchColors <= 1) {
			// Toggle watch colors
			await toWorker("main", "updatePlayersWatch", { pids });
		} else {
			// Show popup to select colors
			const watch = await watchListDialog({
				numPlayers: selectedRows.map.size,
				numWatchColors,
			});
			if (watch !== null) {
				await toWorker("main", "updatePlayersWatch", { pids, watch });
			}
		}
	};

	const onDeletePlayers = async () => {
		const proceed = await confirm(
			`Are you sure you want to delete ${selectedRows.map.size} ${helpers.plural("player", selectedRows.map.size)}?`,
			{
				okText: helpers.plural("Delete player", selectedRows.map.size),
			},
		);
		if (proceed) {
			const pids = Array.from(selectedRows.map.values()).map(metadata => {
				return metadata.pid;
			});
			await toWorker("main", "removePlayers", pids);

			// Clear because the selected players no longer exist!
			selectedRows.clear();
		}
	};

	const actions: {
		godMode?: boolean;
		onClick: (() => void) | undefined;
		text: ReactNode;
		textLong?: ReactNode;
	}[] = [
		{
			onClick: hasSomeSelected ? onComparePlayers : undefined,
			text: "Compare Players",
			textLong: (
				<>
					Compare players
					{selectedRows.map.size > MAX_NUM_TO_COMPARE
						? ` (first ${MAX_NUM_TO_COMPARE} players only)`
						: null}
				</>
			),
		},
		{
			onClick: hasSomeSelected ? onExportPlayers : undefined,
			text: "Export players",
		},
		{
			onClick: hasSomeSelected ? onWatchPlayers : undefined,
			text: (
				<>
					{numWatchColors > 1 ? "Set" : "Toggle"} watch list{" "}
					<Flag watch={nextWatch} />
				</>
			),
		},
		{
			godMode: true,
			onClick: hasSomeSelected ? onDeletePlayers : undefined,
			text: "Delete players",
		},
	];

	if (showInlineButtons) {
		return (
			<div className="d-flex align-items-start gap-2">
				{actions.map((action, i) => {
					if (action.godMode && !godMode) {
						return null;
					}

					return (
						<button
							key={i}
							className={clsx(
								"btn btn-sm",
								action.godMode
									? "btn-god-mode"
									: hasSomeSelected
										? "btn-primary"
										: "btn-secondary",
							)}
							onClick={action.onClick}
						>
							{action.text}
						</button>
					);
				})}
			</div>
		);
	}

	return (
		<>
			<Dropdown
				onToggle={async opening => {
					if (!opening || selectedRows.map.size === 0) {
						return;
					}

					if (numWatchColors <= 1) {
						// Only dynamically update color if there is 1 watch list, otherwise we open a popup to let the user select the color manually
						const pids = Array.from(selectedRows.map.values()).map(metadata => {
							return metadata.pid;
						});

						const newNextWatch = await toWorker(
							"main",
							"getPlayersNextWatch",
							pids,
						);
						setNextWatch(newNextWatch);
					} else {
						// Reset
						if (nextWatch !== undefined) {
							setNextWatch(undefined);
						}
					}
				}}
			>
				<Dropdown.Toggle
					id={`datatable-bulk-actions-${name}`}
					size="sm"
					variant={hasSomeSelected ? "primary" : "secondary"}
				>
					Bulk actions
				</Dropdown.Toggle>
				<Dropdown.Menu>
					{actions.map((action, i) => {
						if (action.godMode && !godMode) {
							return null;
						}

						return (
							<Dropdown.Item
								key={i}
								className={action.godMode ? "god-mode" : undefined}
								onClick={action.onClick}
							>
								{action.textLong ?? action.text}
							</Dropdown.Item>
						);
					})}
					<Dropdown.Header>
						{selectedRows.map.size}{" "}
						{helpers.plural("player", selectedRows.map.size)} selected
					</Dropdown.Header>
				</Dropdown.Menu>
			</Dropdown>
			<ExportModal {...exportModalStatus} />
		</>
	);
};
