import { useCallback, useState } from "react";
import { PHASE } from "../../common";
import {
	DataTable,
	MoreLinks,
	NegotiateButtons,
	RosterComposition,
	RosterSalarySummary,
} from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { confirm, getCols, helpers, toWorker, useLocalPartial } from "../util";
import type { View } from "../../common/types";
import { dataTableWrappedMood } from "../components/Mood";
import {
	wrappedContractAmount,
	wrappedContractExp,
} from "../components/contract";
import { wrappedPlayerNameLabels } from "../components/PlayerNameLabels";
import classNames from "classnames";

const FreeAgents = ({
	capSpace,
	challengeNoFreeAgents,
	challengeNoRatings,
	godMode,
	luxuryPayroll,
	maxContract,
	minContract,
	numRosterSpots,
	spectator,
	payroll,
	phase,
	players,
	salaryCapType,
	season,
	stats,
	type,
	userPlayers,
}: View<"freeAgents">) => {
	const [addFilters, setAddFilters] = useState<
		(string | undefined)[] | undefined
	>();

	const showAfforablePlayers = useCallback(() => {
		const newAddFilters: (string | undefined)[] = new Array(9 + stats.length);
		if (capSpace * 1000 > minContract && !challengeNoFreeAgents) {
			newAddFilters[newAddFilters.length - 3] = `<${capSpace}`;
		} else {
			newAddFilters[newAddFilters.length - 3] = `<${minContract / 1000}`;
		}

		setAddFilters(newAddFilters);

		// This is a hack to make the addFilters passed to DataTable only happen once, otherwise it will keep getting
		// applied every refresh (like when playing games) even if the user had disabled or edited the filter. Really, it'd
		// be better if sent as some kind of signal or event rather than as a prop, because it is transient.
		setTimeout(() => {
			setAddFilters(undefined);
		}, 0);
	}, [capSpace, challengeNoFreeAgents, minContract, stats]);

	useTitleBar({
		title: "Free Agents",
		dropdownView: "free_agents",
		dropdownFields: { typeFreeAgents: type, seasonsFreeAgents: season },
	});

	const { gameSimInProgress } = useLocalPartial(["gameSimInProgress"]);

	if (
		(phase > PHASE.AFTER_TRADE_DEADLINE && phase <= PHASE.RESIGN_PLAYERS) ||
		phase === PHASE.FANTASY_DRAFT ||
		phase === PHASE.EXPANSION_DRAFT
	) {
		return (
			<div>
				<MoreLinks type="freeAgents" page="free_agents" />
				<p>You're not allowed to sign free agents now.</p>
				<p>
					Free agents can only be signed before the playoffs or after players
					are re-signed.
				</p>
			</div>
		);
	}

	const cols = getCols([
		"Name",
		"Pos",
		"Age",
		"Ovr",
		"Pot",
		...stats.map(stat => `stat:${stat}`),
		"Mood",
		"Asking For",
		"Exp",
		"Negotiate",
	]);

	const rows = players.map(p => {
		return {
			key: p.pid,
			data: [
				wrappedPlayerNameLabels({
					pid: p.pid,
					injury: p.injury,
					jerseyNumber: p.jerseyNumber,
					skills: p.ratings.skills,
					watch: p.watch,
					firstName: p.firstName,
					firstNameShort: p.firstNameShort,
					lastName: p.lastName,
				}),
				p.ratings.pos,
				p.age,
				!challengeNoRatings ? p.ratings.ovr : null,
				!challengeNoRatings ? p.ratings.pot : null,
				...stats.map(stat => helpers.roundStat(p.stats[stat], stat)),
				p.freeAgentType === "available"
					? dataTableWrappedMood({
							defaultType: "user",
							maxWidth: true,
							p,
						})
					: undefined,
				wrappedContractAmount(p, p.contract.amount),
				wrappedContractExp(p),
				p.freeAgentType === "available"
					? {
							value: (
								<NegotiateButtons
									canGoOverCap={salaryCapType === "none"}
									capSpace={capSpace}
									disabled={gameSimInProgress}
									minContract={minContract}
									spectator={spectator}
									p={p}
									willingToNegotiate={p.mood.user.willing}
								/>
							),
							searchValue: p.mood.user.willing ? "Negotiate Sign" : "Refuses!",
						}
					: "AAA",
			],
		};
	});

	const showShowPlayersAffordButton = salaryCapType !== "none";

	return (
		<>
			{season === "current" ? (
				<RosterComposition className="float-end mb-3" players={userPlayers} />
			) : null}
			<MoreLinks type="freeAgents" page="free_agents" />
			{season === "current" ? (
				<>
					<RosterSalarySummary
						capSpace={capSpace}
						salaryCapType={salaryCapType}
						luxuryPayroll={luxuryPayroll}
						maxContract={maxContract}
						minContract={minContract}
						numRosterSpots={numRosterSpots}
						payroll={payroll}
					/>

					{showShowPlayersAffordButton || godMode ? (
						<div className="d-sm-flex mb-3">
							{showShowPlayersAffordButton ? (
								<button
									className="btn btn-secondary"
									onClick={showAfforablePlayers}
								>
									Show players you can afford now
								</button>
							) : null}

							<div className="d-block">
								{godMode ? (
									<button
										className={classNames("btn btn-god-mode", {
											"ms-sm-2 mt-2 mt-sm-0": showShowPlayersAffordButton,
										})}
										onClick={async () => {
											const proceed = await confirm(
												`Are you sure you want to delete all ${players.length} free agents?`,
												{
													okText: "Delete Players",
												},
											);
											if (proceed) {
												await toWorker(
													"main",
													"removePlayers",
													players.map(p => p.pid),
												);
											}
										}}
									>
										Delete all players
									</button>
								) : null}
							</div>
						</div>
					) : null}
				</>
			) : null}

			{players.length > 1 ? (
				<div className="mb-3">
					<a
						href={helpers.leagueUrl([
							"compare_players",
							players
								.slice(0, 5)
								.map(p => `${p.pid}-${season}-r`)
								.join(","),
						])}
					>
						Compare top {Math.min(5, players.length)} free agents
					</a>
				</div>
			) : null}

			{gameSimInProgress && !spectator ? (
				<p className="text-danger">Stop game simulation to sign free agents.</p>
			) : null}

			{spectator ? (
				<p className="alert alert-danger d-inline-block">
					The AI will handle signing free agents in spectator mode.
				</p>
			) : challengeNoFreeAgents ? (
				<p className="alert alert-danger d-inline-block">
					<b>Challenge Mode:</b> You are not allowed to sign free agents, except
					to minimum contracts.
				</p>
			) : null}

			<DataTable
				cols={cols}
				defaultSort={[cols.length - 3, "desc"]}
				defaultStickyCols={window.mobile ? 0 : 1}
				name="FreeAgents"
				pagination
				rows={rows}
				addFilters={addFilters}
			/>
		</>
	);
};

export default FreeAgents;
