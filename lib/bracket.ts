// Source of truth for the tournament bracket, transcribed from public/cod_bracket.jpeg
//
// 8-team double elimination. The four UB quarterfinals were already completed
// when the bracket was transcribed, so they are recorded as fixed results and
// are not predictable — predictions start at UB Semifinals / LB Round 1.

export type TeamId =
  | "WAR"
  | "HNT"
  | "PN"
  | "P7"
  | "OMB"
  | "MF"
  | "OMIT"
  | "BUSH";

export interface Team {
  id: TeamId;
  name: string; // short tag shown in bracket cards
  fullName: string;
}

export const TEAMS: Record<TeamId, Team> = {
  WAR: { id: "WAR", name: "WaR", fullName: "Team War" },
  HNT: { id: "HNT", name: "HNT", fullName: "Huntsmen" },
  PN: { id: "PN", name: "PN", fullName: "P7 Notorious" },
  P7: { id: "P7", name: "P7", fullName: "P7 ESports" },
  OMB: { id: "OMB", name: "OM.B", fullName: "Omit Brooklyn" },
  MF: { id: "MF", name: "MF", fullName: "MindFreak" },
  OMIT: { id: "OMIT", name: "OMiT", fullName: "Omit GG" },
  BUSH: { id: "BUSH", name: "BUSH", fullName: "Telluride Bush Gaming" },
};

// Where a game's participant comes from: a fixed team, or the winner/loser of
// an earlier game.
export type SlotSource =
  | { kind: "team"; team: TeamId }
  | { kind: "winner"; game: GameId }
  | { kind: "loser"; game: GameId };

export type GameId =
  | "UBQF1"
  | "UBQF2"
  | "UBQF3"
  | "UBQF4"
  | "UBSF1"
  | "UBSF2"
  | "UBF"
  | "LBR1A"
  | "LBR1B"
  | "LBQF1"
  | "LBQF2"
  | "LBSF"
  | "LBF"
  | "GF";

export interface Game {
  id: GameId;
  round: string; // column header shown in the bracket UI
  bracket: "upper" | "lower" | "final";
  points: number; // points for a correct pick (0 = pre-completed, not predictable)
  slots: [SlotSource, SlotSource];
  // Set for games that were already finished in the source image.
  fixedResult?: { winner: TeamId; score: string };
}

export const GAMES: Record<GameId, Game> = {
  // --- Upper bracket quarterfinals (completed before transcription) ---
  UBQF1: {
    id: "UBQF1",
    round: "UB Quarterfinals",
    bracket: "upper",
    points: 0,
    slots: [
      { kind: "team", team: "WAR" },
      { kind: "team", team: "HNT" },
    ],
    fixedResult: { winner: "WAR", score: "3-0" },
  },
  UBQF2: {
    id: "UBQF2",
    round: "UB Quarterfinals",
    bracket: "upper",
    points: 0,
    slots: [
      { kind: "team", team: "PN" },
      { kind: "team", team: "P7" },
    ],
    fixedResult: { winner: "PN", score: "3-1" },
  },
  UBQF3: {
    id: "UBQF3",
    round: "UB Quarterfinals",
    bracket: "upper",
    points: 0,
    slots: [
      { kind: "team", team: "OMB" },
      { kind: "team", team: "MF" },
    ],
    fixedResult: { winner: "OMB", score: "3-0" },
  },
  UBQF4: {
    id: "UBQF4",
    round: "UB Quarterfinals",
    bracket: "upper",
    points: 0,
    slots: [
      { kind: "team", team: "OMIT" },
      { kind: "team", team: "BUSH" },
    ],
    fixedResult: { winner: "OMIT", score: "3-0" },
  },

  // --- Upper bracket semifinals ---
  UBSF1: {
    id: "UBSF1",
    round: "UB Semifinals",
    bracket: "upper",
    points: 2,
    slots: [
      { kind: "winner", game: "UBQF1" }, // WaR
      { kind: "winner", game: "UBQF2" }, // PN
    ],
  },
  UBSF2: {
    id: "UBSF2",
    round: "UB Semifinals",
    bracket: "upper",
    points: 2,
    slots: [
      { kind: "winner", game: "UBQF3" }, // OM.B
      { kind: "winner", game: "UBQF4" }, // OMiT
    ],
  },

  // --- Upper bracket final ---
  UBF: {
    id: "UBF",
    round: "UB Final",
    bracket: "upper",
    points: 4,
    slots: [
      { kind: "winner", game: "UBSF1" },
      { kind: "winner", game: "UBSF2" },
    ],
  },

  // --- Lower bracket round 1 (UBQF losers) ---
  LBR1A: {
    id: "LBR1A",
    round: "LB Round 1",
    bracket: "lower",
    points: 1,
    slots: [
      { kind: "loser", game: "UBQF1" }, // HNT
      { kind: "loser", game: "UBQF2" }, // P7
    ],
  },
  LBR1B: {
    id: "LBR1B",
    round: "LB Round 1",
    bracket: "lower",
    points: 1,
    slots: [
      { kind: "loser", game: "UBQF3" }, // MF
      { kind: "loser", game: "UBQF4" }, // BUSH
    ],
  },

  // --- Lower bracket quarterfinals (UBSF losers drop in, cross-seeded to
  // avoid immediate UBQF rematches) ---
  LBQF1: {
    id: "LBQF1",
    round: "LBQF",
    bracket: "lower",
    points: 2,
    slots: [
      { kind: "loser", game: "UBSF2" },
      { kind: "winner", game: "LBR1A" },
    ],
  },
  LBQF2: {
    id: "LBQF2",
    round: "LBQF",
    bracket: "lower",
    points: 2,
    slots: [
      { kind: "loser", game: "UBSF1" },
      { kind: "winner", game: "LBR1B" },
    ],
  },

  // --- Lower bracket semifinal ---
  LBSF: {
    id: "LBSF",
    round: "LB Semifinal",
    bracket: "lower",
    points: 3,
    slots: [
      { kind: "winner", game: "LBQF1" },
      { kind: "winner", game: "LBQF2" },
    ],
  },

  // --- Lower bracket final (UBF loser drops in) ---
  LBF: {
    id: "LBF",
    round: "LB Final",
    bracket: "lower",
    points: 4,
    slots: [
      { kind: "loser", game: "UBF" },
      { kind: "winner", game: "LBSF" },
    ],
  },

  // --- Grand final ---
  GF: {
    id: "GF",
    round: "Grand Final",
    bracket: "final",
    points: 8,
    slots: [
      { kind: "winner", game: "UBF" },
      { kind: "winner", game: "LBF" },
    ],
  },
};

// Games users actually predict, in a sensible fill-out order.
export const PREDICTABLE_GAMES: GameId[] = [
  "UBSF1",
  "UBSF2",
  "LBR1A",
  "LBR1B",
  "UBF",
  "LBQF1",
  "LBQF2",
  "LBSF",
  "LBF",
  "GF",
];

export const MAX_SCORE = PREDICTABLE_GAMES.reduce(
  (sum, id) => sum + GAMES[id].points,
  0
);
