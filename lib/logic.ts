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
// Every game in this bracket is predictable, and the fill-out order already
// respects dependencies, so the two orders coincide.
export const GAME_ORDER: GameId[] = [...PREDICTABLE_GAMES];

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
// picked team no longer reaches that game). Fixed pre-completed results are always
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

// For each game, which teams could still win it given the actual results so
// far. Decided games have exactly their winner; undecided games have every
// team that could still reach either slot. (Results are only ever recorded
// once both participants are known, so a decided game's loser is always
// resolvable.)
export function possibleWinners(results: Decided): Record<GameId, TeamId[]> {
  const decided = pruneDecided(results);
  const participants = resolveParticipants(decided);

  // Teams that could still occupy a slot of an undecided game.
  const possible = {} as Record<GameId, TeamId[]>;
  const winners = {} as Record<GameId, TeamId[]>;

  const slotPossible = (source: SlotSource): TeamId[] => {
    if (source.kind === "team") return [source.team];
    const winner = decided[source.game];
    if (source.kind === "winner") {
      return winner ? [winner] : possible[source.game];
    }
    if (winner) {
      const [a, b] = participants[source.game];
      if (a === null || b === null) return [];
      return [winner === a ? b : a];
    }
    return possible[source.game];
  };

  for (const id of GAME_ORDER) {
    const [s1, s2] = GAMES[id].slots;
    possible[id] = [...new Set([...slotPossible(s1), ...slotPossible(s2)])];
    winners[id] = decided[id] ? [decided[id]] : possible[id];
  }
  return winners;
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
  const actual = pruneDecided(results);
  // 28 games is far too many to enumerate scenarios (2^28), so maxPossible is
  // an upper bound instead: a pick still counts as winnable while its team
  // could still win that game. Slightly optimistic across dependent games,
  // and it converges to exact as results come in.
  const winnable = possibleWinners(actual);

  const rows = submissions.map((sub) => {
    const score = scoreSubmission(sub.picks, actual);
    let maxPossible = score;
    for (const id of PREDICTABLE_GAMES) {
      const pick = sub.picks[id];
      if (!actual[id] && pick && winnable[id].includes(pick)) {
        maxPossible += GAMES[id].points;
      }
    }
    return { name: sub.name, score, maxPossible, rank: 0 };
  });

  rows.sort((x, y) => y.score - x.score || y.maxPossible - x.maxPossible);
  rows.forEach((row, i) => {
    row.rank =
      i > 0 && row.score === rows[i - 1].score ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

// Human label for an unresolved slot, e.g. "Winner AW1" / "Loser SF2".
export function slotLabel(source: SlotSource): string {
  if (source.kind === "team") return source.team;
  return `${source.kind === "winner" ? "Winner" : "Loser"} ${source.game}`;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
