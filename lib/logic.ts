// Pure bracket logic shared by client and server: slot resolution, pick
// cascading/pruning, scoring, and leaderboard math.

import {
  GAMES,
  type GameId,
  type TeamId,
  type SlotSource,
  PREDICTABLE_GAMES,
} from "./bracket";

// gameId -> winner. May be partial (games not yet decided/picked).
export type Decided = Partial<Record<GameId, TeamId>>;

export interface Submission {
  name: string;
  picks: Decided;
  createdAt: number;
}

// Topological order: every game appears after the games its slots reference.
export const GAME_ORDER: GameId[] = [
  "UBQF1",
  "UBQF2",
  "UBQF3",
  "UBQF4",
  "UBSF1",
  "UBSF2",
  "LBR1A",
  "LBR1B",
  "LBQF1",
  "LBQF2",
  "UBF",
  "LBSF",
  "LBF",
  "GF",
];

// Winners of games that were already final in the source bracket image.
export function fixedResults(): Decided {
  const out: Decided = {};
  for (const id of GAME_ORDER) {
    const fixed = GAMES[id].fixedResult;
    if (fixed) out[id] = fixed.winner;
  }
  return out;
}

export type Participants = Record<GameId, [TeamId | null, TeamId | null]>;

// Given a set of decided winners, work out who occupies each slot of each game.
// A slot is null until the game(s) it depends on are decided.
export function resolveParticipants(decided: Decided): Participants {
  const participants = {} as Participants;

  const resolveSlot = (source: SlotSource): TeamId | null => {
    if (source.kind === "team") return source.team;
    const winner = decided[source.game] ?? null;
    if (source.kind === "winner") return winner;
    // loser: need the game's winner and both of its participants
    if (!winner) return null;
    const [a, b] = participants[source.game];
    if (a === null || b === null) return null;
    return winner === a ? b : a;
  };

  for (const id of GAME_ORDER) {
    const [s1, s2] = GAMES[id].slots;
    participants[id] = [resolveSlot(s1), resolveSlot(s2)];
  }
  return participants;
}

// Drop any decision that is inconsistent with upstream decisions (e.g. the
// picked team no longer reaches that game). Fixed UBQF results are always
// included in the returned map. Processes in topological order so one removal
// cascades to everything downstream that depended on it.
export function pruneDecided(decided: Decided): Decided {
  const clean: Decided = fixedResults();
  for (const id of GAME_ORDER) {
    if (GAMES[id].fixedResult) continue;
    const winner = decided[id];
    if (!winner) continue;
    const [a, b] = resolveParticipants(clean)[id];
    if (a !== null && b !== null && (winner === a || winner === b)) {
      clean[id] = winner;
    }
  }
  return clean;
}

// Only the user-predictable entries of a decided map.
export function predictableOnly(decided: Decided): Decided {
  const out: Decided = {};
  for (const id of PREDICTABLE_GAMES) {
    if (decided[id]) out[id] = decided[id];
  }
  return out;
}

export function isCompleteBracket(picks: Decided): boolean {
  const pruned = pruneDecided(picks);
  return PREDICTABLE_GAMES.every((id) => pruned[id]);
}

// Points earned so far against the actual results.
export function scoreSubmission(picks: Decided, results: Decided): number {
  let score = 0;
  for (const id of PREDICTABLE_GAMES) {
    if (results[id] && picks[id] === results[id]) score += GAMES[id].points;
  }
  return score;
}

// Every consistent way the remaining games could play out, given the actual
// results so far. At most 2^10 = 1024 scenarios, so brute force is fine.
export function enumerateScenarios(results: Decided): Decided[] {
  const base = pruneDecided(results);
  const scenarios: Decided[] = [];

  const walk = (decided: Decided, idx: number) => {
    if (idx === GAME_ORDER.length) {
      scenarios.push(decided);
      return;
    }
    const id = GAME_ORDER[idx];
    if (decided[id]) {
      walk(decided, idx + 1);
      return;
    }
    const [a, b] = resolveParticipants(decided)[id];
    // In a fully decided prefix both participants are always known.
    for (const team of [a, b]) {
      if (team) walk({ ...decided, [id]: team }, idx + 1);
    }
  };

  walk(base, 0);
  return scenarios;
}

export interface LeaderboardRow {
  name: string;
  score: number;
  maxPossible: number;
  rank: number;
}

export function computeLeaderboard(
  submissions: Submission[],
  results: Decided
): LeaderboardRow[] {
  const scenarios = enumerateScenarios(results);

  const rows = submissions.map((sub) => {
    const score = scoreSubmission(sub.picks, results);
    let best = score;
    for (const scenario of scenarios) {
      let future = 0;
      for (const id of PREDICTABLE_GAMES) {
        if (!results[id] && sub.picks[id] === scenario[id]) {
          future += GAMES[id].points;
        }
      }
      if (score + future > best) best = score + future;
    }
    return { name: sub.name, score, maxPossible: best, rank: 0 };
  });

  rows.sort((x, y) => y.score - x.score || y.maxPossible - x.maxPossible);
  rows.forEach((row, i) => {
    row.rank =
      i > 0 && row.score === rows[i - 1].score ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

// Human label for an unresolved slot, e.g. "Winner UBSF1" / "Loser UBF".
export function slotLabel(source: SlotSource): string {
  if (source.kind === "team") return source.team;
  return `${source.kind === "winner" ? "Winner" : "Loser"} ${source.game}`;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
