import clsx, { type ClassValue } from "clsx";
import { csvFormatRows } from "d3-dsv";
import {
	type SyntheticEvent,
	type MouseEvent,
	type ReactNode,
	useEffect,
} from "react";
import Controls from "./Controls";
import CustomizeColumns from "./CustomizeColumns";
import Footer from "./Footer";
import Header from "./Header";
import Info from "./Info";
import Row from "./Row";
import Pagination from "./Pagination";
import PerPage from "./PerPage";
import createFilterFunction from "./createFilterFunction";
import getSearchVal from "./getSearchVal";
import getSortVal from "./getSortVal";
import ResponsiveTableWrapper from "../ResponsiveTableWrapper";
import { downloadFile, helpers, safeLocalStorage } from "../../util";
import type { SortOrder, SortType } from "../../../common/types";
import { arrayMoveImmutable } from "array-move";
import updateSortBys from "./updateSortBys";
import useStickyXX from "./useStickyXX";
import { orderBy } from "../../../common/utils";
import { normalizeIntl } from "../../../common/normalizeIntl";
import { useDataTableState } from "./useDataTableState";

export type SortBy = [number, SortOrder];

export type Col = {
	classNames?: any;
	desc?: string;
	noSearch?: boolean;
	sortSequence?: SortOrder[];
	sortType?: SortType;
	searchType?: SortType;
	title: string;
	titleReact?: ReactNode;
	width?: string;
};

export type SuperCol = {
	colspan: number;
	desc?: string;
	title: string | ReactNode;
};

export type DataTableRow = {
	key: number | string;
	data: (
		| ReactNode
		| {
				classNames?: ClassValue;
				value: ReactNode;
				searchValue?: string | number;
				sortValue?: string | number;
		  }
	)[];
	classNames?: ClassValue;
};

export type StickyCols = 0 | 1 | 2 | 3;

export type Props = {
	className?: string;
	classNameWrapper?: string;
	clickable?: boolean;
	cols: Col[];
	defaultSort: SortBy;
	disableSettingsCache?: boolean;
	defaultStickyCols?: StickyCols;
	footer?: any[];
	hideAllControls?: boolean;
	hideMenuToo?: boolean;
	name: string;
	nonfluid?: boolean;
	pagination?: boolean;
	rankCol?: number;
	rows: DataTableRow[];
	small?: boolean;
	striped?: boolean;
	superCols?: SuperCol[];
	addFilters?: (string | undefined)[];
};

const DataTable = ({
	className,
	classNameWrapper,
	clickable = true,
	cols,
	defaultSort,
	defaultStickyCols = 0,
	disableSettingsCache,
	footer,
	hideAllControls,
	hideMenuToo,
	name,
	nonfluid,
	pagination,
	rankCol,
	rows,
	small,
	striped,
	superCols,
	addFilters,
}: Props) => {
	const [state, setStatePartial, resetState] = useDataTableState({
		cols,
		defaultSort,
		defaultStickyCols,
		disableSettingsCache,
		name,
	});

	const processRows = () => {
		const filterFunctions = state.enableFilters
			? state.filters.map((filter, i) =>
					createFilterFunction(
						filter,
						cols[i] ? cols[i].sortType : undefined,
						cols[i] ? cols[i].searchType : undefined,
					),
				)
			: [];
		const skipFiltering = state.searchText === "" && !state.enableFilters;
		const searchText = normalizeIntl(state.searchText);
		const rowsFiltered = skipFiltering
			? rows
			: rows.filter(row => {
					// Search
					if (state.searchText !== "") {
						let found = false;

						for (let i = 0; i < row.data.length; i++) {
							// cols[i] might be undefined if number of columns in a table changed
							if (cols[i]?.noSearch) {
								continue;
							}

							if (
								normalizeIntl(getSearchVal(row.data[i], false)).includes(
									searchText,
								)
							) {
								found = true;
								break;
							}
						}

						if (!found) {
							return false;
						}
					}

					// Filter
					if (state.enableFilters) {
						for (let i = 0; i < row.data.length; i++) {
							// cols[i] might be undefined if number of columns in a table changed
							if (cols[i]?.noSearch) {
								continue;
							}

							if (
								filterFunctions[i] &&
								filterFunctions[i](row.data[i]) === false
							) {
								return false;
							}
						}
					}

					return true;
				});

		const sortKeys = state.sortBys.map(sortBy => (row: DataTableRow) => {
			let i = sortBy[0];

			if (typeof i !== "number" || i >= row.data.length || i >= cols.length) {
				i = 0;
			}

			return getSortVal(row.data[i], cols[i].sortType);
		});

		const rowsOrdered = orderBy(
			rowsFiltered,
			sortKeys,
			state.sortBys.map(sortBy => sortBy[1]),
		);

		const colOrderFiltered = state.colOrder.filter(
			({ hidden, colIndex }) => !hidden && cols[colIndex],
		);

		return rowsOrdered.map((row, i) => {
			return {
				...row,
				data: colOrderFiltered.map(({ colIndex }) =>
					colIndex === rankCol ? i + 1 : row.data[colIndex],
				),
			};
		});
	};

	const handleColClick = (event: MouseEvent, i: number) => {
		const sortBys = updateSortBys({
			cols,
			event,
			i,
			prevSortBys: state.sortBys,
		});

		state.settingsCache.set("DataTableSort", sortBys);
		setStatePartial({
			currentPage: 1,
			sortBys,
		});
	};

	const handleExportCSV = () => {
		const colOrderFiltered = state.colOrder.filter(
			({ hidden, colIndex }) => !hidden && cols[colIndex],
		);
		const columns = colOrderFiltered.map(({ colIndex }) => cols[colIndex]);
		const colNames = columns.map(col => col.title);
		const rows = processRows().map(row =>
			row.data.map((val, i) => {
				const sortType = columns[i].sortType;
				if (sortType === "currency" || sortType === "number") {
					return getSortVal(val, sortType, true);
				}
				return getSearchVal(val, false);
			}),
		);
		const output = csvFormatRows([colNames, ...rows]);
		downloadFile(`${name}.csv`, output, "text/csv");
	};

	const handleResetTable = () => {
		state.settingsCache.clear("DataTableColOrder");
		state.settingsCache.clear("DataTableFilters");
		state.settingsCache.clear("DataTableSort");
		state.settingsCache.clear("DataTableStickyCols");

		resetState({
			cols,
			defaultSort,
			defaultStickyCols,
			disableSettingsCache,
			name,
		});
	};

	const handleSelectColumns = () => {
		setStatePartial({
			showSelectColumnsModal: true,
		});
	};

	const handleToggleFilters = () => {
		// Remove filter cache if hiding, add filter cache if displaying
		if (state.enableFilters) {
			state.settingsCache.clear("DataTableFilters");
		} else {
			state.settingsCache.set("DataTableFilters", state.filters);
		}

		setStatePartial({
			enableFilters: !state.enableFilters,
		});
	};

	const handleFilterUpdate = (
		event: SyntheticEvent<HTMLInputElement>,
		i: number,
	) => {
		const filters = helpers.deepCopy(state.filters);

		filters[i] = event.currentTarget.value;
		setStatePartial({
			currentPage: 1,
			filters,
		});
		state.settingsCache.set("DataTableFilters", filters);
	};

	const handlePagination = (newPage: number) => {
		if (newPage !== state.currentPage) {
			setStatePartial({
				currentPage: newPage,
			});
		}
	};

	const handlePerPage = (event: SyntheticEvent<HTMLSelectElement>) => {
		const perPage = parseInt(event.currentTarget.value);

		if (!Number.isNaN(perPage) && perPage !== state.perPage) {
			safeLocalStorage.setItem("perPage", String(perPage));
			setStatePartial({
				currentPage: 1,
				perPage,
			});
		}
	};

	const handleSearch = (event: SyntheticEvent<HTMLInputElement>) => {
		setStatePartial({
			currentPage: 1,
			searchText: event.currentTarget.value,
		});
	};

	// If name changes, it means this is a whole new table and it has a different state (example: Player Stats switching between regular and advanced stats).
	// If colOrder does not match cols, need to run reconciliation code in loadStateFromCache (example: current vs past seasons in League Finances).
	if (name !== state.prevName || cols.length > state.colOrder.length) {
		resetState({
			cols,
			defaultSort,
			defaultStickyCols,
			disableSettingsCache,
			name,
		});
	}

	useEffect(() => {
		if (
			addFilters !== undefined &&
			addFilters.length === state.filters.length
		) {
			// If addFilters is passed and contains a value, merge with prevState.filters and enable filters
			const filters = helpers.deepCopy(state.filters);
			let changed = false;

			for (let i = 0; i < addFilters.length; i++) {
				const filter = addFilters[i];
				if (filter !== undefined) {
					filters[i] = filter;
					changed = true;
				} else if (!state.enableFilters) {
					// If there is a saved but hidden filter, remove it
					filters[i] = "";
				}
			}

			if (changed) {
				state.settingsCache.set("DataTableFilters", filters);
				setStatePartial({
					enableFilters: true,
					filters,
				});
			}
		}
	}, [
		addFilters,
		setStatePartial,
		state.enableFilters,
		state.filters,
		state.settingsCache,
	]);

	let processedRows = processRows();
	const numRowsFiltered = processedRows.length;
	const start = 1 + (state.currentPage - 1) * state.perPage;
	let end = start + state.perPage - 1;

	if (end > processedRows.length) {
		end = processedRows.length;
	}

	if (pagination) {
		processedRows = processedRows.slice(start - 1, end);
	}

	const colOrderFiltered = state.colOrder.filter(
		({ hidden, colIndex }) => !hidden && cols[colIndex],
	);

	const highlightCols = state.sortBys
		.map(sortBy => sortBy[0])
		.map(i =>
			colOrderFiltered.findIndex(({ colIndex }) => {
				if (colIndex !== i) {
					return false;
				}

				// Make sure sortSequence is not an empty array - same code is in Header
				const sortSequence = cols[colIndex].sortSequence;
				if (sortSequence && sortSequence.length === 0) {
					return false;
				}

				return true;
			}),
		);

	const { stickyClass, tableRef } = useStickyXX(state.stickyCols);

	return (
		<>
			<CustomizeColumns
				cols={cols}
				colOrder={state.colOrder}
				hasSuperCols={!!superCols}
				show={state.showSelectColumnsModal}
				onHide={() => {
					setStatePartial({
						showSelectColumnsModal: false,
					});
				}}
				onReset={() => {
					const newOrder = cols.map((col, i) => ({
						colIndex: i,
					}));
					setStatePartial({
						colOrder: newOrder,
						stickyCols: defaultStickyCols,
					});
					state.settingsCache.set("DataTableColOrder", newOrder);
					state.settingsCache.clear("DataTableStickyCols");
				}}
				onChange={({ oldIndex, newIndex }) => {
					const newOrder = arrayMoveImmutable(
						state.colOrder,
						oldIndex,
						newIndex,
					);
					setStatePartial({
						colOrder: newOrder,
					});
					state.settingsCache.set("DataTableColOrder", newOrder);
				}}
				onToggleHidden={(i: number) => () => {
					const newOrder = [...state.colOrder];
					if (newOrder[i]) {
						newOrder[i] = {
							...newOrder[i],
						};
						if (newOrder[i].hidden) {
							delete newOrder[i].hidden;
						} else {
							newOrder[i].hidden = true;
						}
						setStatePartial({
							colOrder: newOrder,
						});
						state.settingsCache.set("DataTableColOrder", newOrder);
					}
				}}
				onChangeStickyCols={stickyCols => {
					setStatePartial({
						stickyCols,
					});
					state.settingsCache.set("DataTableStickyCols", stickyCols);
				}}
				stickyCols={state.stickyCols}
			/>
			<div className={className}>
				<div
					className={clsx({
						"d-inline-block mw-100": nonfluid,
					})}
				>
					<>
						{pagination && !hideAllControls ? (
							<PerPage onChange={handlePerPage} value={state.perPage} />
						) : null}
						{!hideMenuToo ? (
							<Controls
								enableFilters={state.enableFilters}
								hideAllControls={hideAllControls}
								name={name}
								onExportCSV={handleExportCSV}
								onResetTable={handleResetTable}
								onSearch={handleSearch}
								onSelectColumns={handleSelectColumns}
								onToggleFilters={handleToggleFilters}
								searchText={state.searchText}
							/>
						) : null}
						{nonfluid ? <div className="clearFix" /> : null}
					</>
					<ResponsiveTableWrapper
						className={clsx(
							classNameWrapper,
							pagination ? "fix-margin-pagination" : null,
						)}
						nonfluid={nonfluid}
					>
						<table
							className={clsx(
								"table table-hover",
								{
									"table-sm": small !== false,
									"table-striped": striped !== false,
									"table-borderless": striped !== false,
								},
								stickyClass,
							)}
							ref={tableRef}
						>
							<Header
								colOrder={colOrderFiltered}
								cols={cols}
								enableFilters={state.enableFilters}
								filters={state.filters}
								handleColClick={handleColClick}
								handleFilterUpdate={handleFilterUpdate}
								sortBys={state.sortBys}
								superCols={superCols}
							/>
							<tbody>
								{processedRows.map(row => (
									<Row
										key={row.key}
										row={row}
										clickable={clickable}
										highlightCols={highlightCols}
									/>
								))}
							</tbody>
							<Footer
								colOrder={colOrderFiltered}
								footer={footer}
								highlightCols={highlightCols}
							/>
						</table>
					</ResponsiveTableWrapper>
					{!hideAllControls ? (
						<>
							{nonfluid && pagination ? <div className="clearFix" /> : null}
							{pagination ? (
								<Info
									end={end}
									numRows={numRowsFiltered}
									numRowsUnfiltered={rows.length}
									start={start}
								/>
							) : null}
							{pagination ? (
								<Pagination
									currentPage={state.currentPage}
									numRows={numRowsFiltered}
									onClick={handlePagination}
									perPage={state.perPage}
								/>
							) : null}
						</>
					) : null}
				</div>
			</div>
		</>
	);
};

export default DataTable;
