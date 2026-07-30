// Source of truth for the EWC Last Chance Qualifier bracket (Jul 31 – Aug 2,
// 2026), transcribed from the schedule in public/lcqbracket.JPG. The winner
// takes the "LCQ" slot in the main EWC bracket (lib/bracket.ts).
//
// Format: 15 teams, full double elimination. All matches Bo5 except the Bo7
// Grand Final. Upper bracket: Ro16 (Day 1) -> quarterfinals -> semifinals ->
// UB Final. Lower bracket: Ro16 losers pair off (LB Ro8a), winners meet the
// UB quarterfinal losers (LB Ro8b), and so on down to the LB Final against
// the UB Final loser; the Grand Final decides the EWC spot.
//
// The "#16" slot on the schedule sheet is a bye: Arrow Tech Edge advances
// straight to the UB quarterfinals without playing, so there's no R1 game.
// Because a bye has no loser, the LB Round 1 game it would have fed (LA1) is
// a walkover too — the loser of R2 skips straight to LB Round 2.
//
// NOTE: the schedule sheet lists rounds and matches but not the losers'
// bracket wiring, so the drop-down slots below use the standard double-elim
// convention (adjacent Ro16 losers meet; later rounds cross-seeded to avoid
// instant rematches). Adjust here if the official bracket differs.

import type { BracketDef, DecidedMap, EngineGame, EngineSubmission, Slot } from "./engine";

export type LcqTeamId =
  | "ARROW"
  | "ERAS"
  | "RAUZAN"
  | "OMNIA"
  | "PAIN"
  | "TBG"
  | "ULTRAA"
  | "TORN"
  | "EVO"
  | "BSG"
  | "ATLAS"
  | "BTD"
  | "ANNEX"
  | "PIT"
  | "RAD";

export interface LcqTeam {
  id: LcqTeamId;
  name: string; // short tag shown in bracket cards
  fullName: string;
}

export const LCQ_TEAMS: Record<LcqTeamId, LcqTeam> = {
  ARROW: { id: "ARROW", name: "Arrow", fullName: "Arrow Tech Edge (Ro16 bye)" },
  ERAS: { id: "ERAS", name: "ERAS", fullName: "ERAS Esports" },
  RAUZAN: { id: "RAUZAN", name: "Rauzan", fullName: "Rauzan Esports" },
  OMNIA: { id: "OMNIA", name: "OMNIA", fullName: "OMNIA INVICTA" },
  PAIN: { id: "PAIN", name: "PainNation", fullName: "PainNationDE" },
  TBG: { id: "TBG", name: "Bush", fullName: "Telluride Bush Gaming" },
  ULTRAA: { id: "ULTRAA", name: "ultraa", fullName: "team_ultraa_mvp" },
  TORN: { id: "TORN", name: "Torn", fullName: "Torn esports" },
  EVO: { id: "EVO", name: "Evolitik", fullName: "Evolitik_EU" },
  BSG: { id: "BSG", name: "BSGG", fullName: "BitterSweetGG" },
  ATLAS: { id: "ATLAS", name: "Atlas", fullName: "TheAtlasLions" },
  BTD: { id: "BTD", name: "BTD", fullName: "BTD ESPORTS" },
  ANNEX: { id: "ANNEX", name: "Annex", fullName: "Annex Esports" },
  PIT: { id: "PIT", name: "Pit EU", fullName: "The Pit EU" },
  RAD: { id: "RAD", name: "RADDER", fullName: "RADDERMITES" },
};

export type LcqGameId =
  // Upper bracket (no R1 — Arrow Tech Edge has the bye)
  | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" // UB Ro16
  | "UQ1" | "UQ2" | "UQ3" | "UQ4" // UB quarterfinals (UB Ro8)
  | "US1" | "US2" // UB semifinals (UB Ro4)
  | "UF" // UB Final
  // Lower bracket (no LA1 — the R2 loser walks over into LB1)
  | "LA2" | "LA3" | "LA4" // LB Ro8a: Ro16 losers pair off
  | "LB1" | "LB2" | "LB3" | "LB4" // LB Ro8b: vs UB quarterfinal losers
  | "LC1" | "LC2" // LB Ro4a
  | "LD1" | "LD2" // LB Ro4b: vs UB semifinal losers
  | "LE" // LB semifinal (LB Ro2a)
  | "LF" // LB Final: vs UB Final loser
  | "GF"; // Grand Final — winner qualifies for EWC

export type LcqGame = EngineGame<LcqGameId, LcqTeamId>;
export type LcqDecided = DecidedMap<LcqGameId, LcqTeamId>;
export type LcqSubmission = EngineSubmission<LcqGameId, LcqTeamId>;

type S = Slot<LcqGameId, LcqTeamId>;

const game = (
  id: LcqGameId,
  round: string,
  points: number,
  slots: [S, S]
): LcqGame => ({ id, round, points, slots });

const team = (team: LcqTeamId): S => ({ kind: "team", team });
const winner = (game: LcqGameId): S => ({ kind: "winner", game });
const loser = (game: LcqGameId): S => ({ kind: "loser", game });

export const LCQ_GAMES: Record<LcqGameId, LcqGame> = {
  // --- UB Round of 16 (Jul 31), matchups #2–#8 from the schedule.
  // Match #1 is Arrow Tech Edge's bye — they're seeded into UQ1 directly. ---
  R2: game("R2", "UB Round of 16", 1, [team("ERAS"), team("RAUZAN")]),
  R3: game("R3", "UB Round of 16", 1, [team("OMNIA"), team("PAIN")]),
  R4: game("R4", "UB Round of 16", 1, [team("TBG"), team("ULTRAA")]),
  R5: game("R5", "UB Round of 16", 1, [team("TORN"), team("EVO")]),
  R6: game("R6", "UB Round of 16", 1, [team("BSG"), team("ATLAS")]),
  R7: game("R7", "UB Round of 16", 1, [team("BTD"), team("ANNEX")]),
  R8: game("R8", "UB Round of 16", 1, [team("PIT"), team("RAD")]),

  // --- UB quarterfinals (Aug 1); Arrow enters here off the bye ---
  UQ1: game("UQ1", "UB Quarterfinals", 2, [team("ARROW"), winner("R2")]),
  UQ2: game("UQ2", "UB Quarterfinals", 2, [winner("R3"), winner("R4")]),
  UQ3: game("UQ3", "UB Quarterfinals", 2, [winner("R5"), winner("R6")]),
  UQ4: game("UQ4", "UB Quarterfinals", 2, [winner("R7"), winner("R8")]),

  // --- LB round 1: Ro16 losers pair off (elimination). No LA1 — the bye's
  // side has only one Ro16 loser (R2's), who walks over into LB1. ---
  LA2: game("LA2", "LB Round 1", 1, [loser("R3"), loser("R4")]),
  LA3: game("LA3", "LB Round 1", 1, [loser("R5"), loser("R6")]),
  LA4: game("LA4", "LB Round 1", 1, [loser("R7"), loser("R8")]),

  // --- LB round 2: vs UB quarterfinal losers (cross-seeded within halves) ---
  LB1: game("LB1", "LB Round 2", 2, [loser("R2"), loser("UQ2")]),
  LB2: game("LB2", "LB Round 2", 2, [winner("LA2"), loser("UQ1")]),
  LB3: game("LB3", "LB Round 2", 2, [winner("LA3"), loser("UQ4")]),
  LB4: game("LB4", "LB Round 2", 2, [winner("LA4"), loser("UQ3")]),
  // (LB2's LA2 pairing keeps the halves aligned: the R3/R4 losers' survivor
  // meets UQ1's loser, mirroring LB1 on the bye side.)

  // --- UB semifinals ---
  US1: game("US1", "UB Semifinals", 3, [winner("UQ1"), winner("UQ2")]),
  US2: game("US2", "UB Semifinals", 3, [winner("UQ3"), winner("UQ4")]),

  // --- LB round 3 ---
  LC1: game("LC1", "LB Round 3", 2, [winner("LB1"), winner("LB2")]),
  LC2: game("LC2", "LB Round 3", 2, [winner("LB3"), winner("LB4")]),

  // --- LB round 4: vs UB semifinal losers (cross-seeded) ---
  LD1: game("LD1", "LB Round 4", 3, [winner("LC1"), loser("US2")]),
  LD2: game("LD2", "LB Round 4", 3, [winner("LC2"), loser("US1")]),

  // --- Day 3 (Aug 2) ---
  LE: game("LE", "LB Semifinal", 3, [winner("LD1"), winner("LD2")]),
  UF: game("UF", "UB Final", 4, [winner("US1"), winner("US2")]),
  LF: game("LF", "LB Final", 4, [loser("UF"), winner("LE")]),
  GF: game("GF", "Grand Final", 6, [winner("UF"), winner("LF")]),
};

// Fill-out order (also topological: every game after its dependencies).
export const LCQ_ORDER: LcqGameId[] = [
  "R2", "R3", "R4", "R5", "R6", "R7", "R8",
  "UQ1", "UQ2", "UQ3", "UQ4",
  "LA2", "LA3", "LA4",
  "LB1", "LB2", "LB3", "LB4",
  "US1", "US2",
  "LC1", "LC2",
  "LD1", "LD2",
  "LE", "UF", "LF", "GF",
];

export const LCQ_DEF: BracketDef<LcqGameId, LcqTeamId> = {
  games: LCQ_GAMES,
  order: LCQ_ORDER,
};

export const LCQ_MAX_SCORE = LCQ_ORDER.reduce(
  (sum, id) => sum + LCQ_GAMES[id].points,
  0
);
