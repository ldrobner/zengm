import { idb } from "../../db";
import { g } from "../../util";

const validateExpansionDraftSetup = async () => {
	const expansionDraft = g.get("expansionDraft");
	if (expansionDraft.phase !== "setup") {
		throw new Error("Invalid expansion draft phase");
	}

	const expansionTeamsRaw = expansionDraft.teams || [];
	const numProtectedPlayersRaw =
		expansionDraft.numProtectedPlayers ||
		String(g.get("minRosterSize") - expansionTeamsRaw.length);

	const errors = [];
	const teams = await idb.cache.teams.getAll();
	const divs = await g.get("divs", Infinity);

	// Do some error checking
	const expansionTeams = expansionTeamsRaw.map(t => {
		if (t.imgURL === "") {
			t.imgURL = undefined;
		}

		if (t.abbrev === "") {
			errors.push(`Abbrev cannot be blank`);
		} else {
			if (t.name === "") {
				errors.push(`Blank team name for ${t.abbrev}`);
			}
			if (t.region === "") {
				errors.push(`Blank team region for ${t.abbrev}`);
			}
		}

		const pop = parseFloat(t.pop);
		if (Number.isNaN(pop)) {
			errors.push(`Invalid population for ${t.abbrev}`);
		}

		const stadiumCapacity = parseInt(t.stadiumCapacity);
		if (Number.isNaN(stadiumCapacity)) {
			errors.push(`Invalid stadium capacity for ${t.abbrev}`);
		}

		const did = parseInt(t.did);
		let foundDiv = false;
		for (const div of divs) {
			if (did === div.did) {
				foundDiv = true;
				break;
			}
		}
		if (!foundDiv) {
			errors.push(`Invalid division for ${t.abbrev}`);
		}

		for (const t2 of teams) {
			if (t2.abbrev === t.abbrev) {
				errors.push(`Abbrev ${t.abbrev} is already used by an existing team`);
			}
		}

		for (const t2 of expansionTeamsRaw) {
			if (t !== t2 && t2.abbrev === t.abbrev) {
				errors.push(`Abbrev ${t.abbrev} is used by multiple expansion teams`);
			}
		}

		return {
			...t,
			did,
			pop,
			stadiumCapacity,
		};
	});

	if (expansionTeams.length === 0) {
		errors.push("No expansion teams");
	}

	const numProtectedPlayers = parseInt(numProtectedPlayersRaw);
	if (Number.isNaN(numProtectedPlayers) || numProtectedPlayers < 0) {
		errors.push("Invalid number of protected players");
	}

	const errorsOutput =
		errors.length > 0 ? Array.from(new Set(errors)) : undefined;

	return {
		errors: errorsOutput,
		expansionTeams,
		numProtectedPlayers,
	};
};

export default validateExpansionDraftSetup;
