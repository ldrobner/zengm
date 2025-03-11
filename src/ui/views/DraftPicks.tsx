import { DataTable, MoreLinks } from "../components";
import useTitleBar from "../hooks/useTitleBar";
import { getCols, helpers } from "../util";
import type { View } from "../../common/types";
import type { DataTableRow } from "../components/DataTable";

const DraftTeamHistory = ({
	abbrev,
	challengeNoRatings,
	draftPicks,
	draftType,
}: View<"draftPicks">) => {
	useTitleBar({
		title: "Draft Picks",
		dropdownView: "draft_picks",
		dropdownFields: { teams: abbrev },
	});

	const cols = getCols(
		[
			"Year",
			"Draft Round",
			"Draft Pick",
			"Team",
			"Power Ranking",
			"Ovr",
			"Record",
			"AvgAge",
		],
		{
			"Draft Round": {
				title: "Round",
			},
			"Draft Pick": {
				title: "Pick",
			},
			AvgAge: {
				title: "Avg Age",
			},
			Ovr: {
				title: "Team Ovr",
			},
		},
	);

	const rows: DataTableRow[] = draftPicks.map((dp) => {
		return {
			key: dp.dpid,
			data: [
				dp.season,
				dp.round,
				dp.pick > 0 ? dp.pick : null,
				dp.originalTid !== dp.tid ? (
					<a
						href={helpers.leagueUrl([
							"roster",
							`${dp.originalAbbrev}_${dp.originalTid}`,
						])}
					>
						{dp.originalAbbrev}
					</a>
				) : null,
				dp.powerRanking,
				!challengeNoRatings ? dp.ovr : null,
				helpers.formatRecord(dp.record),
				dp.avgAge.toFixed(1),
			],
		};
	});

	return (
		<>
			<MoreLinks type="draft" page="draft_picks" draftType={draftType} />

			<p>
				Players currently on your team are{" "}
				<span className="text-info">highlighted in blue</span>. Players in the
				Hall of Fame are <span className="text-danger">highlighted in red</span>
				.
			</p>

			<DataTable
				style={{
					maxWidth: 600,
				}}
				cols={cols}
				defaultSort={[0, "asc"]}
				name="DraftPicks"
				rows={rows}
			/>
		</>
	);
};

export default DraftTeamHistory;
