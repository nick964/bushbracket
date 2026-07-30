"use client";

// LCQ bracket view: TournamentBracket bound to the Last Chance Qualifier
// definition and layout (16-team full double elimination).

import {
  LCQ_DEF,
  LCQ_TEAMS,
  type LcqDecided,
  type LcqGameId,
  type LcqTeamId,
} from "@/lib/lcq";
import TournamentBracket, { type Section } from "@/components/TournamentBracket";

const SECTIONS: Section<LcqGameId>[] = [
  {
    phase: "Phase_01 // Upper Bracket",
    label: "Upper Bracket",
    caption:
      "All matches Bo5. Lose anywhere up here and you drop to the lower bracket — one more loss and you're out.",
    rows: [
      {
        columns: [
          {
            title: "Round of 16",
            games: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
          },
          { title: "Quarterfinals", games: ["UQ1", "UQ2", "UQ3", "UQ4"] },
          { title: "Semifinals", games: ["US1", "US2"] },
          { title: "UB Final", games: ["UF"] },
        ],
      },
    ],
  },
  {
    phase: "Phase_02 // Lower Bracket",
    label: "Lower Bracket",
    caption:
      "Ro16 losers pair off, then upper-bracket losers drop in each round. Survive it all to reach the LB Final against the UB Final loser.",
    rows: [
      {
        columns: [
          { title: "LB Round 1", games: ["LA1", "LA2", "LA3", "LA4"] },
          { title: "LB Round 2", games: ["LB1", "LB2", "LB3", "LB4"] },
          { title: "LB Round 3", games: ["LC1", "LC2"] },
          { title: "LB Round 4", games: ["LD1", "LD2"] },
          { title: "LB Semifinal", games: ["LE"] },
          { title: "LB Final", games: ["LF"] },
        ],
      },
    ],
  },
  {
    phase: "Phase_03 // Winner takes the EWC spot",
    label: "Grand Final",
    caption:
      "Bo7. UB Final winner vs LB Final winner — the champion qualifies for the Esports World Cup.",
    rows: [{ columns: [{ title: "Grand Final", games: ["GF"] }] }],
  },
];

export interface LcqBracketViewProps {
  decided: LcqDecided;
  onPick?: (game: LcqGameId, team: LcqTeamId) => void;
  onClear?: (game: LcqGameId) => void;
  compare?: LcqDecided;
}

export default function LcqBracketView(props: LcqBracketViewProps) {
  return (
    <TournamentBracket
      def={LCQ_DEF}
      teams={LCQ_TEAMS}
      sections={SECTIONS}
      goldGame="GF"
      goldLabel="GF // EWC Spot"
      {...props}
    />
  );
}
