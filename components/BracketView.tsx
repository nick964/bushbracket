"use client";

// EWC bracket view: TournamentBracket bound to the EWC definition and layout.
// Props are unchanged from before the LCQ was added, so call sites (home,
// admin, scoreboard) don't care about the generic renderer underneath.

import { TEAMS, type GameId, type TeamId } from "@/lib/bracket";
import { EWC_DEF, type Decided } from "@/lib/logic";
import TournamentBracket, { type Section } from "@/components/TournamentBracket";

// Games whose winner claims a playoff spot — marked with a "Q" badge.
const QUALIFIER_GAMES = new Set<GameId>([
  "AW1",
  "AW2",
  "AD1",
  "AD2",
  "BW1",
  "BW2",
  "BD1",
  "BD2",
]);

const groupSection = (letter: "A" | "B", phase: string): Section<GameId> => ({
  phase: `${phase} // Double Elimination`,
  label: `Group ${letter}`,
  caption:
    "Win a Winners' Match or a Decider (Q) to advance to the playoffs.",
  rows: [
    {
      columns: [
        {
          title: "Opening Round",
          games: [`${letter}1`, `${letter}2`, `${letter}3`, `${letter}4`] as GameId[],
        },
        {
          title: "Winners' Matches",
          games: [`${letter}W1`, `${letter}W2`] as GameId[],
        },
      ],
    },
    {
      note: "Losers drop down — lose here and you're out",
      columns: [
        {
          title: "Elimination Round",
          games: [`${letter}E1`, `${letter}E2`] as GameId[],
        },
        {
          title: "Deciders",
          games: [`${letter}D1`, `${letter}D2`] as GameId[],
        },
      ],
    },
  ],
});

const SECTIONS: Section<GameId>[] = [
  groupSection("A", "Phase_01"),
  groupSection("B", "Phase_02"),
  {
    phase: "Phase_03 // Single Elimination",
    label: "Championship Stage",
    caption:
      "Group winners face the other group's deciders. Quarters and semis are Bo7, the grand final Bo9.",
    rows: [
      {
        columns: [
          { title: "Quarterfinals", games: ["QF1", "QF2", "QF3", "QF4"] },
          { title: "Semifinals", games: ["SF1", "SF2"] },
          { title: "Grand Final", games: ["GF"] },
          { title: "3rd Place", games: ["TP"] },
        ],
      },
    ],
  },
];

export interface BracketViewProps {
  /** Winners to display (fixed pre-completed results are always shown regardless). */
  decided: Decided;
  /** Click a team to pick/set a winner. Omit for read-only display. */
  onPick?: (game: GameId, team: TeamId) => void;
  /** Undo button on decided games (admin). */
  onClear?: (game: GameId) => void;
  /** Actual results to grade `decided` against (green/red). */
  compare?: Decided;
}

export default function BracketView(props: BracketViewProps) {
  return (
    <TournamentBracket
      def={EWC_DEF}
      teams={TEAMS}
      sections={SECTIONS}
      qualifierGames={QUALIFIER_GAMES}
      qualifierTitle="Winner qualifies for the playoffs"
      goldGame="GF"
      goldLabel="GF // The Decider"
      {...props}
    />
  );
}
