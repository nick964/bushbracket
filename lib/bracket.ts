// Source of truth for the tournament bracket: Call of Duty: Black Ops 7 at
// the Esports World Cup 2026 (Aug 5–9), transcribed from the schedule in
// public/ewc_bracket.jpg.
//
// Format: 16 teams in two groups of 8. Each group is double elimination down
// to four qualifiers — opening round, then winners' matches (winners qualify),
// elimination games for the opening-round losers, and deciders (winners'
// losers vs elimination winners, cross-seeded to avoid instant rematches).
// The eight qualifiers play a single-elimination playoff: quarterfinals,
// semifinals, a 3rd-place match, and the grand final.
//
// NOTE: EWC has not published quarterfinal seeding (the schedule lists them
// as TBD). The QF slot wiring below is the standard cross-group convention
// (group winners vs the other group's deciders) — adjust it here when the
// official bracket drops. Same for "LCQ": one Group A slot belongs to the
// Last Chance Qualifier winner, not decided until Aug 2.

export type TeamId =
  | "KOI"
  | "RAVENS"
  | "FAZE"
  | "LCQ"
  | "G2"
  | "C9"
  | "M8"
  | "OMIT"
  | "OPTIC"
  | "WAR"
  | "100T"
  | "BREACH"
  | "HERETICS"
  | "SURGE"
  | "FALCONS"
  | "PN";

export interface Team {
  id: TeamId;
  name: string; // short tag shown in bracket cards
  fullName: string;
}

export const TEAMS: Record<TeamId, Team> = {
  // Group A
  KOI: { id: "KOI", name: "KOI", fullName: "KOI" },
  RAVENS: { id: "RAVENS", name: "Ravens", fullName: "Carolina Royal Ravens" },
  FAZE: { id: "FAZE", name: "FaZe", fullName: "Atlanta FaZe" },
  LCQ: { id: "LCQ", name: "TBD", fullName: "Last Chance Qualifier winner" },
  G2: { id: "G2", name: "G2", fullName: "G2 Esports" },
  C9: { id: "C9", name: "C9", fullName: "Cloud9" },
  M8: { id: "M8", name: "M8", fullName: "Gentle Mates" },
  OMIT: { id: "OMIT", name: "OMiT", fullName: "OMiT" },
  // Group B
  OPTIC: { id: "OPTIC", name: "OpTic", fullName: "OpTic Gaming" },
  WAR: { id: "WAR", name: "WaR", fullName: "Team WaR" },
  "100T": { id: "100T", name: "100T", fullName: "100 Thieves" },
  BREACH: { id: "BREACH", name: "Breach", fullName: "Boston Breach" },
  HERETICS: { id: "HERETICS", name: "Heretics", fullName: "Team Heretics" },
  SURGE: { id: "SURGE", name: "Surge", fullName: "Vancouver Surge" },
  FALCONS: { id: "FALCONS", name: "Falcons", fullName: "Team Falcons" },
  PN: { id: "PN", name: "PN", fullName: "P7 Notorious" },
};

// Where a game's participant comes from: a fixed team, or the winner/loser of
// an earlier game.
export type SlotSource =
  | { kind: "team"; team: TeamId }
  | { kind: "winner"; game: GameId }
  | { kind: "loser"; game: GameId };

export type GameId =
  // Group A
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "AW1"
  | "AW2"
  | "AE1"
  | "AE2"
  | "AD1"
  | "AD2"
  // Group B
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "BW1"
  | "BW2"
  | "BE1"
  | "BE2"
  | "BD1"
  | "BD2"
  // Playoffs
  | "QF1"
  | "QF2"
  | "QF3"
  | "QF4"
  | "SF1"
  | "SF2"
  | "TP"
  | "GF";

export interface Game {
  id: GameId;
  round: string; // human label for the round
  bracket: "groupA" | "groupB" | "playoffs";
  points: number; // points for a correct pick
  slots: [SlotSource, SlotSource];
  // Set for games that were already finished when the bracket was transcribed.
  fixedResult?: { winner: TeamId; score: string };
}

const game = (
  id: GameId,
  round: string,
  bracket: Game["bracket"],
  points: number,
  slots: [SlotSource, SlotSource]
): Game => ({ id, round, bracket, points, slots });

const team = (team: TeamId): SlotSource => ({ kind: "team", team });
const winner = (game: GameId): SlotSource => ({ kind: "winner", game });
const loser = (game: GameId): SlotSource => ({ kind: "loser", game });

export const GAMES: Record<GameId, Game> = {
  // --- Group A opening (Aug 5) ---
  A1: game("A1", "Group A Opening", "groupA", 1, [team("KOI"), team("RAVENS")]),
  A2: game("A2", "Group A Opening", "groupA", 1, [team("FAZE"), team("LCQ")]),
  A3: game("A3", "Group A Opening", "groupA", 1, [team("G2"), team("C9")]),
  A4: game("A4", "Group A Opening", "groupA", 1, [team("M8"), team("OMIT")]),

  // --- Group A winners' matches (winners qualify for playoffs) ---
  AW1: game("AW1", "Group A Winners", "groupA", 2, [winner("A1"), winner("A2")]),
  AW2: game("AW2", "Group A Winners", "groupA", 2, [winner("A3"), winner("A4")]),

  // --- Group A elimination games (losers are out) ---
  AE1: game("AE1", "Group A Elimination", "groupA", 1, [loser("A1"), loser("A2")]),
  AE2: game("AE2", "Group A Elimination", "groupA", 1, [loser("A3"), loser("A4")]),

  // --- Group A deciders (winners take the last two playoff spots) ---
  AD1: game("AD1", "Group A Decider", "groupA", 2, [loser("AW1"), winner("AE2")]),
  AD2: game("AD2", "Group A Decider", "groupA", 2, [loser("AW2"), winner("AE1")]),

  // --- Group B opening (Aug 5–6) ---
  B1: game("B1", "Group B Opening", "groupB", 1, [team("OPTIC"), team("WAR")]),
  B2: game("B2", "Group B Opening", "groupB", 1, [team("100T"), team("BREACH")]),
  B3: game("B3", "Group B Opening", "groupB", 1, [team("HERETICS"), team("SURGE")]),
  B4: game("B4", "Group B Opening", "groupB", 1, [team("FALCONS"), team("PN")]),

  // --- Group B winners' matches ---
  BW1: game("BW1", "Group B Winners", "groupB", 2, [winner("B1"), winner("B2")]),
  BW2: game("BW2", "Group B Winners", "groupB", 2, [winner("B3"), winner("B4")]),

  // --- Group B elimination games ---
  BE1: game("BE1", "Group B Elimination", "groupB", 1, [loser("B1"), loser("B2")]),
  BE2: game("BE2", "Group B Elimination", "groupB", 1, [loser("B3"), loser("B4")]),

  // --- Group B deciders ---
  BD1: game("BD1", "Group B Decider", "groupB", 2, [loser("BW1"), winner("BE2")]),
  BD2: game("BD2", "Group B Decider", "groupB", 2, [loser("BW2"), winner("BE1")]),

  // --- Playoffs (Aug 8–9). Pairings assumed: group winners vs the other
  // group's deciders — update when EWC publishes the official bracket. ---
  QF1: game("QF1", "Quarterfinals", "playoffs", 3, [winner("AW1"), winner("BD1")]),
  QF2: game("QF2", "Quarterfinals", "playoffs", 3, [winner("BW2"), winner("AD2")]),
  QF3: game("QF3", "Quarterfinals", "playoffs", 3, [winner("BW1"), winner("AD1")]),
  QF4: game("QF4", "Quarterfinals", "playoffs", 3, [winner("AW2"), winner("BD2")]),

  SF1: game("SF1", "Semifinals", "playoffs", 4, [winner("QF1"), winner("QF2")]),
  SF2: game("SF2", "Semifinals", "playoffs", 4, [winner("QF3"), winner("QF4")]),

  TP: game("TP", "3rd Place Match", "playoffs", 3, [loser("SF1"), loser("SF2")]),
  GF: game("GF", "Grand Final", "playoffs", 6, [winner("SF1"), winner("SF2")]),
};

// Games users actually predict, in a sensible fill-out order. Every game is
// predictable — nothing had been played when the bracket was transcribed.
export const PREDICTABLE_GAMES: GameId[] = [
  "A1",
  "A2",
  "A3",
  "A4",
  "B1",
  "B2",
  "B3",
  "B4",
  "AW1",
  "AW2",
  "AE1",
  "AE2",
  "BW1",
  "BW2",
  "BE1",
  "BE2",
  "AD1",
  "AD2",
  "BD1",
  "BD2",
  "QF1",
  "QF2",
  "QF3",
  "QF4",
  "SF1",
  "SF2",
  "TP",
  "GF",
];

export const MAX_SCORE = PREDICTABLE_GAMES.reduce(
  (sum, id) => sum + GAMES[id].points,
  0
);
