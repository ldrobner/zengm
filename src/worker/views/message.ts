import { idb } from "../db";
import { g, helpers, updatePlayMenu, updateStatus } from "../util";
import type { UpdateEvents, ViewInput } from "../../common/types";
import getPlayoffsByConf from "../core/season/getPlayoffsByConf";
import { getRoundsWonText } from "./frivolitiesTeamSeasons";

const updateMessage = async (
	inputs: ViewInput<"message">,
	updateEvents: UpdateEvents,
	state: any,
) => {
	// Complexity of updating is to handle auto-read message, so inputs.mid is blank
	if (
		updateEvents.includes("firstRun") ||
		!state.message ||
		state.message.mid !== inputs.mid
	) {
		let message;
		let readThisPageview = false;

		if (inputs.mid === undefined) {
			const messages = (
				await idb.getCopies.messages(
					{
						limit: 10,
					},
					"noCopyCache",
				)
			).reverse(); // First look for an unread message

			for (const m of messages) {
				if (!m.read) {
					// https://stackoverflow.com/a/59923262/786644
					const returnValue = {
						redirectUrl: helpers.leagueUrl(["message", m.mid]),
					};
					return returnValue;
				}
			}

			// Then look for any message
			if (messages.length > 0) {
				// https://stackoverflow.com/a/59923262/786644
				const returnValue = {
					redirectUrl: helpers.leagueUrl(["message", messages[0].mid]),
				};
				return returnValue;
			}
		} else {
			message = await idb.getCopy.messages(
				{
					mid: inputs.mid,
				},
				"noCopyCache",
			);
		}

		if (message && !message.read) {
			message.read = true;
			readThisPageview = true;
			await idb.cache.messages.put(message);
		}

		if (readThisPageview) {
			if (g.get("gameOver")) {
				await updateStatus("You're fired!");
			}

			await updatePlayMenu();
		}

		let augmentedMessage;
		if (message) {
			let augmentedOwnerMoods;
			if (message.ownerMoods) {
				augmentedOwnerMoods = [];

				for (let i = 0; i < message.ownerMoods.length; i++) {
					const mood = message.ownerMoods[i];

					const season = message.year - message.ownerMoods.length + 1 + i;

					const teamSeason = await idb.getCopy.teamSeasons({
						// Old messages don't include tid
						tid: message.tid ?? g.get("userTid"),
						season,
					});

					let seasonInfo;
					if (teamSeason) {
						const roundsWonText = getRoundsWonText(
							teamSeason,
							await getPlayoffsByConf(teamSeason.season),
						).toLocaleLowerCase();

						const revenue = helpers
							.keys(teamSeason.revenues)
							.reduce((memo, rev) => memo + teamSeason.revenues[rev], 0);
						const expense = helpers
							.keys(teamSeason.expenses)
							.reduce((memo, rev) => memo + teamSeason.expenses[rev], 0);
						const profit = (revenue - expense) / 1000; // [millions of dollars]

						seasonInfo = {
							won: teamSeason.won,
							lost: teamSeason.lost,
							tied: teamSeason.tied,
							otl: teamSeason.otl,
							roundsWonText,
							profit,
						};
					}

					augmentedOwnerMoods.push({
						...mood,
						total: mood.money + mood.playoffs + mood.wins,
						season,
						seasonInfo,
					});
				}
			}

			augmentedMessage = {
				...message,
				ownerMoods: augmentedOwnerMoods,
			};
		}

		return {
			message: augmentedMessage,
		};
	}
};

export default updateMessage;
