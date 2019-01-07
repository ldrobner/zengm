// @flow

import type { Position } from "../../../common/types";
import type { PenaltyPlayType } from "./types";

type Penalty = {
    name: string,
    side: "offense" | "defense",
    playTypes: PenaltyPlayType[],
    probPerPlay: number,
    numPerSeason: number,
    yds: number,
    automaticFirstDown?: true,
    notBallCarrier?: true,
    spotFoul?: true,

    // undefined means no player is assigned the penalty (like delay of game). An empty object means all players will be given equal weight.
    posOdds?: {
        [key: Position]: number,
    },
};

const penalties: Penalty[] = [
    {
        name: "Holding",
        side: "offense",
        playTypes: [
            "kickoffReturn",
            "fieldGoal",
            "punt",
            "puntReturn",
            "pass",
            "run",
        ],
        probPerPlay: 0,
        numPerSeason: 709,
        yds: 10,
        posOdds: {
            OL: 0.83,
            TE: 0.1,
            WR: 0.05,
            RB: 0.02,
        },
        notBallCarrier: true,
        spotFoul: true,
    },
    {
        name: "False start",
        side: "offense",
        playTypes: ["beforeSnap"],
        probPerPlay: 0,
        numPerSeason: 560,
        yds: 5,
        posOdds: {
            OL: 0.92,
            TE: 0.05,
            WR: 0.02,
            RB: 0.01,
        },
    },
    {
        name: "Pass interference",
        side: "defense",
        playTypes: ["pass"],
        probPerPlay: 0,
        numPerSeason: 237,
        yds: 0,
        posOdds: {
            CB: 0.6,
            S: 0.3,
            LB: 0.1,
        },
        spotFoul: true,
    },
    {
        name: "Holding",
        side: "defense",
        playTypes: ["pass", "run"],
        probPerPlay: 0,
        numPerSeason: 236,
        yds: 5,
        posOdds: {
            DL: 0.25,
            LB: 0.25,
            S: 0.25,
            CB: 0.25,
        },
        automaticFirstDown: true,
    },
    {
        name: "Unnecessary roughness",
        side: "defense",
        playTypes: [
            "kickoffReturn",
            "fieldGoal",
            "punt",
            "puntReturn",
            "pass",
            "run",
        ],
        probPerPlay: 0,
        numPerSeason: 150,
        yds: 15,
        posOdds: {
            DL: 0.25,
            LB: 0.25,
            S: 0.25,
            CB: 0.25,
        },
    },
    {
        name: "Unnecessary roughness",
        side: "offense",
        playTypes: [
            "kickoffReturn",
            "fieldGoal",
            "punt",
            "puntReturn",
            "pass",
            "run",
        ],
        probPerPlay: 0,
        numPerSeason: 50,
        yds: 15,
        posOdds: {
            QB: 0.01,
            RB: 0.14,
            WR: 0.3,
            TE: 0.15,
            OL: 0.4,
        },
    },
    {
        name: "Illegal block in the back",
        side: "offense",
        playTypes: ["puntReturn"],
        probPerPlay: 0,
        numPerSeason: 184,
        yds: 10,
        posOdds: {
            DL: 0.4,
            S: 0.6,
        },
    },
    {
        name: "Neutral zone infraction",
        side: "defense",
        playTypes: ["beforeSnap"],
        probPerPlay: 0,
        numPerSeason: 143,
        yds: 5,
        posOdds: {
            DL: 0.85,
            LB: 0.15,
        },
    },
    {
        name: "Offsides",
        side: "defense",
        playTypes: ["fieldGoal", "punt", "puntReturn", "pass", "run"],
        probPerPlay: 0,
        numPerSeason: 143,
        yds: 5,
        posOdds: {
            DL: 0.85,
            LB: 0.15,
        },
    },
    {
        name: "Roughing the passer",
        side: "defense",
        playTypes: ["pass"],
        probPerPlay: 0,
        numPerSeason: 114,
        yds: 15,
        posOdds: {
            DL: 0.7,
            LB: 0.24,
            S: 0.04,
            CB: 0.02,
        },
    },
    {
        name: "Delay of game",
        side: "offense",
        playTypes: ["beforeSnap"],
        probPerPlay: 0,
        numPerSeason: 111,
        yds: 5,
    },
    {
        name: "Face mask",
        side: "defense",
        playTypes: ["pass", "run", "kickoffReturn", "puntReturn"],
        probPerPlay: 0,
        numPerSeason: 80,
        yds: 15,
        posOdds: {
            LB: 0.6,
            DL: 0.2,
            S: 0.1,
            CB: 0.1,
        },
    },
    {
        name: "Face mask",
        side: "offense",
        playTypes: ["pass", "run", "kickoffReturn", "puntReturn"],
        probPerPlay: 0,
        numPerSeason: 8,
        yds: 15,
        posOdds: {
            RB: 0.3,
            WR: 0.3,
            OL: 0.25,
            TE: 0.15,
        },
    },
    {
        name: "Pass interference",
        side: "offense",
        playTypes: ["pass"],
        probPerPlay: 0,
        numPerSeason: 83,
        yds: 10,
        posOdds: {
            WR: 0.82,
            TE: 0.16,
            RB: 0.02,
        },
    },
    {
        name: "Illegal formation",
        side: "offense",
        playTypes: ["pass", "run"],
        probPerPlay: 0,
        numPerSeason: 71,
        yds: 5,
    },
    {
        name: "Illegal use of hands",
        side: "defense",
        playTypes: ["pass", "run"],
        probPerPlay: 0,
        numPerSeason: 36,
        yds: 5,
        posOdds: {},
        automaticFirstDown: true,
    },
    {
        name: "Illegal use of hands",
        side: "offense",
        playTypes: ["pass", "run"],
        probPerPlay: 0,
        numPerSeason: 35,
        yds: 10,
        posOdds: {
            RB: 0.1,
            WR: 0.3,
            OL: 0.5,
            TE: 0.1,
        },
    },
    {
        name: "Unsportsmanlike conduct",
        side: "defense",
        playTypes: ["beforeSnap"],
        probPerPlay: 0,
        numPerSeason: 27,
        yds: 15,
        posOdds: {},
    },
    {
        name: "Unsportsmanlike conduct",
        side: "offense",
        playTypes: ["beforeSnap"],
        probPerPlay: 0,
        numPerSeason: 26,
        yds: 15,
        posOdds: {},
    },
    {
        name: "Illegal shift",
        side: "offense",
        playTypes: ["beforeSnap"],
        probPerPlay: 0,
        numPerSeason: 43,
        yds: 5,
        posOdds: {
            RB: 0.2,
            WR: 0.6,
            TE: 0.2,
        },
    },
    {
        name: "Illegal contact",
        side: "defense",
        playTypes: ["pass"],
        probPerPlay: 0,
        numPerSeason: 43,
        yds: 5,
        posOdds: {
            LB: 0.1,
            S: 0.1,
            CB: 0.8,
        },
    },
];

// Total each season, to compare with penalty.numPerSeason for frequency calculation
const numPlays = {
    kickoffReturn: 2500,
    punt: 2000,
    puntReturn: 2000,
    fieldGoal: 2000, // Includes extra points
    pass: 17500,
    run: 13000,
    beforeSnap: 0,
};
numPlays.beforeSnap =
    numPlays.punt + numPlays.fieldGoal + numPlays.pass + numPlays.run;

for (const pen of penalties) {
    const chances = pen.playTypes.reduce(
        (sum, playType) => sum + numPlays[playType],
        0,
    );
    pen.probPerPlay = pen.numPerSeason / chances;
}

export default penalties;
