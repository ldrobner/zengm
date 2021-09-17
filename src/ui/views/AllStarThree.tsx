import useTitleBar from "../hooks/useTitleBar";
import { helpers, toWorker } from "../util";
import type { View } from "../../common/types";
import { PlayPauseNext } from "../components";
import { useEffect, useState } from "react";
import { isSport } from "../../common";
import { ContestantProfiles, EditContestants, ScoreTable } from "./AllStarDunk";
import range from "lodash-es/range";
import classNames from "classnames";

const NUM_BALLS_PER_RACK = 5;

const ShotTable = ({ racks }: { racks: boolean[][] }) => {
	const rackNames = ["Corner", "Wing", "Top Key", "Wing", "Corner"];

	const highlight = (i: number) =>
		i % 2 === 1 ? "table-bg-striped" : undefined;

	return (
		<div className="row" style={{ maxWidth: 800 }}>
			{rackNames.map((name, i) => (
				<div key={i} className={classNames("col-12 col-sm", highlight(i))}>
					<div className="font-weight-bold text-center my-1">{name}</div>
					<div className="d-flex mb-2">
						{range(NUM_BALLS_PER_RACK).map(j => {
							const shotResult: boolean | undefined = racks[i]?.[j];
							const moneyball = j === NUM_BALLS_PER_RACK - 1;

							return (
								<div
									className="flex-fill d-flex justify-content-center"
									key={j}
								>
									{shotResult === undefined ? (
										<div style={{ width: 18, height: 18 }} />
									) : shotResult ? (
										<img
											alt={`Make (${moneyball ? "moneyball" : "normal"})`}
											title={`Make (${moneyball ? "moneyball" : "normal"})`}
											width="18"
											height="18"
											src={moneyball ? "/ico/logo-gold.png" : "/ico/logo.png"}
										/>
									) : (
										<img
											alt={`Miss (${moneyball ? "moneyball" : "normal"})`}
											title={`Miss (${moneyball ? "moneyball" : "normal"})`}
											width="18"
											height="18"
											src="/ico/logo.png"
											style={{
												filter: "grayscale(100%)",
												opacity: 0.7,
											}}
										/>
									)}
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
};

const AllStarThree = ({
	allPossibleContestants,
	challengeNoRatings,
	godMode,
	players,
	resultsByRound,
	season,
	started,
	three,
	userTid,
}: View<"allStarThree">) => {
	if (!isSport("basketball")) {
		throw new Error("Not implemented");
	}

	const [paused, setPaused] = useState(true);

	useEffect(() => {
		let obsolete = false;

		const run = async () => {
			if (!paused) {
				await new Promise<void>(resolve => {
					setTimeout(() => {
						resolve();
					}, 2000);
				});
				if (!obsolete) {
					await toWorker("main", "threeSimNext", "event");
				}
			}
		};

		run();

		return () => {
			obsolete = true;
		};
	}, [paused]);

	useTitleBar({
		title: "Three-Point Contest",
		dropdownView: "all_star_three",
		dropdownFields: { seasons: season },
		dropdownCustomURL: fields => {
			return helpers.leagueUrl(["all_star", "three", fields.seasons]);
		},
	});

	return (
		<>
			{godMode && !started ? (
				<EditContestants
					allPossibleContestants={allPossibleContestants}
					contest="three"
					initialPlayers={three.players}
				/>
			) : null}

			<ContestantProfiles
				challengeNoRatings={challengeNoRatings}
				contest={three}
				godMode={godMode}
				players={players}
				season={season}
				userTid={userTid}
			/>

			<ScoreTable
				contest={three}
				resultsByRound={resultsByRound}
				players={players}
			/>

			{three.winner === undefined ? (
				<PlayPauseNext
					className="mb-3"
					fastForwards={[
						{
							label: "Complete rack",
							onClick: async () => {
								await toWorker("main", "threeSimNext", "rack");
							},
						},
						{
							label: "Complete player",
							onClick: async () => {
								await toWorker("main", "threeSimNext", "player");
							},
						},
						{
							label: "End of round",
							onClick: async () => {
								await toWorker("main", "threeSimNext", "round");
							},
						},
						{
							label: "End of contest",
							onClick: async () => {
								await toWorker("main", "threeSimNext", "all");
							},
						},
					]}
					onPlay={() => {
						setPaused(false);
					}}
					onPause={() => {
						setPaused(true);
					}}
					onNext={async () => {
						await toWorker("main", "threeSimNext", "event");
					}}
					paused={paused}
				/>
			) : null}

			{three.winner !== undefined ? (
				<p className="alert alert-success d-inline-block">
					{three.players[three.winner].name} is your {season} three-point
					contest champion!
				</p>
			) : (
				<>
					<ShotTable racks={three.rounds.at(-1).results.at(-1)?.racks ?? []} />
				</>
			)}
		</>
	);
};

export default AllStarThree;
