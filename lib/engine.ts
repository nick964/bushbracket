// Tournament-agnostic bracket engine: slot resolution, pick cascading/pruning,
// scoring, and leaderboard math, parameterized by a bracket definition so it
// can drive both the EWC bracket and the LCQ. The EWC-bound wrappers with the
// original signatures live in lib/logic.ts.

// Where a game's participant comes from: a fixed team, or the winner/loser of
// an earlier game.
export type Slot<G extends string, T extends string> =
  | { kind: "team"; team: T }
  | { kind: "winner"; game: G }
  | { kind: "loser"; game: G };

export interface EngineGame<G extends string, T extends string> {
  id: G;
  round: string; // human label for the round
  points: number; // points for a correct pick
  slots: [Slot<G, T>, Slot<G, T>];
  // Set for games that were already finished when the bracket was transcribed.
  fixedResult?: { winner: T; score: string };
}

export interface BracketDef<G extends string, T extends string> {
  games: Record<G, EngineGame<G, T>>;
  // Topological order: every game appears after the games its slots reference.
  // Also the set of user-predictable games.
  order: G[];
}

// gameId -> winner. May be partial (games not yet decided/picked).
export type DecidedMap<G extends string, T extends string> = Partial<
  Record<G, T>
>;

export interface EngineSubmission<G extends string, T extends string> {
  name: string;
  picks: DecidedMap<G, T>;
  createdAt: number;
  /** Player has paid the buy-in (marked by the admin) — eligible for the full pot. */
  paid?: boolean;
}

// Winners of games that were already final in the source bracket image.
export function fixedResults<G extends string, T extends string>(
  def: BracketDef<G, T>
): DecidedMap<G, T> {
  const out: DecidedMap<G, T> = {};
  for (const id of def.order) {
    const fixed = def.games[id].fixedResult;
    if (fixed) out[id] = fixed.winner;
  }
  return out;
}

export type ParticipantsMap<G extends string, T extends string> = Record<
  G,
  [T | null, T | null]
>;

// Given a set of decided winners, work out who occupies each slot of each game.
// A slot is null until the game(s) it depends on are decided.
export function resolveParticipants<G extends string, T extends string>(
  def: BracketDef<G, T>,
  decided: DecidedMap<G, T>
): ParticipantsMap<G, T> {
  const participants = {} as ParticipantsMap<G, T>;

  const resolveSlot = (source: Slot<G, T>): T | null => {
    if (source.kind === "team") return source.team;
    const winner = decided[source.game] ?? null;
    if (source.kind === "winner") return winner;
    // loser: need the game's winner and both of its participants
    if (!winner) return null;
    const [a, b] = participants[source.game];
    if (a === null || b === null) return null;
    return winner === a ? b : a;
  };

  for (const id of def.order) {
    const [s1, s2] = def.games[id].slots;
    participants[id] = [resolveSlot(s1), resolveSlot(s2)];
  }
  return participants;
}

// Drop any decision that is inconsistent with upstream decisions (e.g. the
// picked team no longer reaches that game). Fixed pre-completed results are always
// included in the returned map. Processes in topological order so one removal
// cascades to everything downstream that depended on it.
export function pruneDecided<G extends string, T extends string>(
  def: BracketDef<G, T>,
  decided: DecidedMap<G, T>
): DecidedMap<G, T> {
  const clean: DecidedMap<G, T> = fixedResults(def);
  for (const id of def.order) {
    if (def.games[id].fixedResult) continue;
    const winner = decided[id];
    if (!winner) continue;
    const [a, b] = resolveParticipants(def, clean)[id];
    if (a !== null && b !== null && (winner === a || winner === b)) {
      clean[id] = winner;
    }
  }
  return clean;
}

// Only the user-predictable entries of a decided map.
export function predictableOnly<G extends string, T extends string>(
  def: BracketDef<G, T>,
  decided: DecidedMap<G, T>
): DecidedMap<G, T> {
  const out: DecidedMap<G, T> = {};
  for (const id of def.order) {
    if (decided[id]) out[id] = decided[id];
  }
  return out;
}

export function isCompleteBracket<G extends string, T extends string>(
  def: BracketDef<G, T>,
  picks: DecidedMap<G, T>
): boolean {
  const pruned = pruneDecided(def, picks);
  return def.order.every((id) => pruned[id]);
}

// Points earned so far against the actual results.
export function scoreSubmission<G extends string, T extends string>(
  def: BracketDef<G, T>,
  picks: DecidedMap<G, T>,
  results: DecidedMap<G, T>
): number {
  let score = 0;
  for (const id of def.order) {
    if (results[id] && picks[id] === results[id]) {
      score += def.games[id].points;
    }
  }
  return score;
}

// For each game, which teams could still win it given the actual results so
// far. Decided games have exactly their winner; undecided games have every
// team that could still reach either slot. (Results are only ever recorded
// once both participants are known, so a decided game's loser is always
// resolvable.)
export function possibleWinners<G extends string, T extends string>(
  def: BracketDef<G, T>,
  results: DecidedMap<G, T>
): Record<G, T[]> {
  const decided = pruneDecided(def, results);
  const participants = resolveParticipants(def, decided);

  // Teams that could still occupy a slot of an undecided game.
  const possible = {} as Record<G, T[]>;
  const winners = {} as Record<G, T[]>;

  const slotPossible = (source: Slot<G, T>): T[] => {
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

  for (const id of def.order) {
    const [s1, s2] = def.games[id].slots;
    possible[id] = [...new Set([...slotPossible(s1), ...slotPossible(s2)])];
    winners[id] = decided[id] ? [decided[id]] : possible[id];
  }
  return winners;
}

export interface LeaderboardRow {
  name: string;
  paid: boolean;
  score: number;
  maxPossible: number;
  rank: number;
}

export function computeLeaderboard<G extends string, T extends string>(
  def: BracketDef<G, T>,
  submissions: EngineSubmission<G, T>[],
  results: DecidedMap<G, T>
): LeaderboardRow[] {
  const actual = pruneDecided(def, results);
  // Too many games to enumerate scenarios (2^n), so maxPossible is an upper
  // bound instead: a pick still counts as winnable while its team could still
  // win that game. Slightly optimistic across dependent games, and it
  // converges to exact as results come in.
  const winnable = possibleWinners(def, actual);

  const rows = submissions.map((sub) => {
    const score = scoreSubmission(def, sub.picks, actual);
    let maxPossible = score;
    for (const id of def.order) {
      const pick = sub.picks[id];
      if (!actual[id] && pick && winnable[id].includes(pick)) {
        maxPossible += def.games[id].points;
      }
    }
    return { name: sub.name, paid: Boolean(sub.paid), score, maxPossible, rank: 0 };
  });

  rows.sort((x, y) => y.score - x.score || y.maxPossible - x.maxPossible);
  rows.forEach((row, i) => {
    row.rank =
      i > 0 && row.score === rows[i - 1].score ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

// Human label for an unresolved slot, e.g. "Winner AW1" / "Loser SF2".
export function slotLabel<G extends string, T extends string>(
  source: Slot<G, T>
): string {
  if (source.kind === "team") return source.team;
  return `${source.kind === "winner" ? "Winner" : "Loser"} ${source.game}`;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
