// EWC-bound bracket logic shared by client and server. The actual algorithms
// live in lib/engine.ts (tournament-agnostic); this module binds them to the
// EWC bracket definition so existing call sites keep their original
// signatures. The LCQ equivalent lives in lib/lcq.ts.

import {
  GAMES,
  type GameId,
  type TeamId,
  type SlotSource,
  PREDICTABLE_GAMES,
} from "./bracket";
import * as engine from "./engine";

// gameId -> winner. May be partial (games not yet decided/picked).
export type Decided = engine.DecidedMap<GameId, TeamId>;

export type Submission = engine.EngineSubmission<GameId, TeamId>;

export type { LeaderboardRow } from "./engine";

export const EWC_DEF: engine.BracketDef<GameId, TeamId> = {
  games: GAMES,
  order: PREDICTABLE_GAMES,
};

// Topological order: every game appears after the games its slots reference.
// Every game in this bracket is predictable, and the fill-out order already
// respects dependencies, so the two orders coincide.
export const GAME_ORDER: GameId[] = [...PREDICTABLE_GAMES];

// Winners of games that were already final in the source bracket image.
export function fixedResults(): Decided {
  return engine.fixedResults(EWC_DEF);
}

export type Participants = engine.ParticipantsMap<GameId, TeamId>;

// Given a set of decided winners, work out who occupies each slot of each game.
export function resolveParticipants(decided: Decided): Participants {
  return engine.resolveParticipants(EWC_DEF, decided);
}

// Drop any decision that is inconsistent with upstream decisions.
export function pruneDecided(decided: Decided): Decided {
  return engine.pruneDecided(EWC_DEF, decided);
}

// Only the user-predictable entries of a decided map.
export function predictableOnly(decided: Decided): Decided {
  return engine.predictableOnly(EWC_DEF, decided);
}

export function isCompleteBracket(picks: Decided): boolean {
  return engine.isCompleteBracket(EWC_DEF, picks);
}

// Points earned so far against the actual results.
export function scoreSubmission(picks: Decided, results: Decided): number {
  return engine.scoreSubmission(EWC_DEF, picks, results);
}

// For each game, which teams could still win it given the actual results so far.
export function possibleWinners(results: Decided): Record<GameId, TeamId[]> {
  return engine.possibleWinners(EWC_DEF, results);
}

export function computeLeaderboard(
  submissions: Submission[],
  results: Decided
): engine.LeaderboardRow[] {
  return engine.computeLeaderboard(EWC_DEF, submissions, results);
}

// Human label for an unresolved slot, e.g. "Winner AW1" / "Loser SF2".
export function slotLabel(source: SlotSource): string {
  return engine.slotLabel(source);
}

export { normalizeName } from "./engine";
