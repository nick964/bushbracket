"use client";

import { GAMES, TEAMS, type GameId, type TeamId } from "@/lib/bracket";
import {
  resolveParticipants,
  slotLabel,
  type Decided,
} from "@/lib/logic";

interface Column {
  title: string;
  games: GameId[];
}

const UPPER_COLUMNS: Column[] = [
  { title: "UB Quarterfinals", games: ["UBQF1", "UBQF2", "UBQF3", "UBQF4"] },
  { title: "UB Semifinals", games: ["UBSF1", "UBSF2"] },
  { title: "UB Final", games: ["UBF"] },
  { title: "Grand Final", games: ["GF"] },
];

const LOWER_COLUMNS: Column[] = [
  { title: "LB Round 1", games: ["LBR1A", "LBR1B"] },
  { title: "LB Quarterfinals", games: ["LBQF1", "LBQF2"] },
  { title: "LB Semifinal", games: ["LBSF"] },
  { title: "LB Final", games: ["LBF"] },
];

export interface BracketViewProps {
  /** Winners to display (fixed UBQF results are always shown regardless). */
  decided: Decided;
  /** Click a team to pick/set a winner. Omit for read-only display. */
  onPick?: (game: GameId, team: TeamId) => void;
  /** Undo button on decided games (admin). */
  onClear?: (game: GameId) => void;
  /** Actual results to grade `decided` against (green/red). */
  compare?: Decided;
}

export default function BracketView({
  decided,
  onPick,
  onClear,
  compare,
}: BracketViewProps) {
  const participants = resolveParticipants(decided);

  const renderColumns = (columns: Column[]) => (
    <div className="flex min-w-max gap-3 sm:gap-4">
      {columns.map((col) => (
        <div key={col.title} className="flex w-40 sm:w-48 flex-col">
          <div className="mb-2 rounded bg-zinc-800/80 px-2 py-1.5 text-center font-display text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {col.title}
          </div>
          <div className="flex flex-1 flex-col justify-around gap-3">
            {col.games.map((id) => (
              <GameCard
                key={id}
                gameId={id}
                slots={participants[id]}
                winner={decided[id] ?? GAMES[id].fixedResult?.winner}
                onPick={onPick}
                onClear={onClear}
                actual={compare?.[id]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="space-y-6">
        {renderColumns(UPPER_COLUMNS)}
        <div className="flex min-w-max items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="font-display text-xs uppercase tracking-widest text-zinc-600">
            Lower Bracket
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        {renderColumns(LOWER_COLUMNS)}
      </div>
    </div>
  );
}

function GameCard({
  gameId,
  slots,
  winner,
  onPick,
  onClear,
  actual,
}: {
  gameId: GameId;
  slots: [TeamId | null, TeamId | null];
  winner?: TeamId;
  onPick?: (game: GameId, team: TeamId) => void;
  onClear?: (game: GameId) => void;
  actual?: TeamId;
}) {
  const game = GAMES[gameId];
  const isFixed = Boolean(game.fixedResult);
  const bothKnown = slots[0] !== null && slots[1] !== null;
  const clickable = Boolean(onPick) && !isFixed && bothKnown;

  // Grade this game's pick when actual results are provided
  const graded = !isFixed && actual !== undefined && winner !== undefined;
  const correct = graded && winner === actual;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-zinc-900 ${
        graded
          ? correct
            ? "border-emerald-500/70"
            : "border-red-500/70"
          : winner && !isFixed
            ? "border-orange-500/50"
            : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {gameId}
        </span>
        <span className="flex items-center gap-1.5">
          {graded && (
            <span
              className={`text-[10px] font-bold ${correct ? "text-emerald-400" : "text-red-400"}`}
            >
              {correct ? `+${game.points}` : "✗"}
            </span>
          )}
          {!isFixed && (
            <span className="text-[10px] font-medium text-zinc-600">
              {game.points} pt{game.points === 1 ? "" : "s"}
            </span>
          )}
          {isFixed && (
            <span className="text-[10px] font-medium text-zinc-600">
              {game.fixedResult!.score}
            </span>
          )}
          {onClear && winner && !isFixed && (
            <button
              onClick={() => onClear(gameId)}
              className="rounded bg-zinc-800 px-1.5 text-[10px] font-semibold text-zinc-300 hover:bg-red-900/60 hover:text-red-200"
              title="Undo this result"
            >
              undo
            </button>
          )}
        </span>
      </div>
      {slots.map((team, i) => {
        const isWinner = team !== null && winner === team;
        const label = team ? TEAMS[team].name : slotLabel(game.slots[i]);
        return (
          <button
            key={i}
            disabled={!clickable || team === null}
            title={team ? TEAMS[team].fullName : undefined}
            onClick={() => team && onPick?.(gameId, team)}
            className={`flex w-full items-center justify-between px-2.5 py-2 text-left font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
              i === 0 ? "border-b border-zinc-800/70" : ""
            } ${
              team === null
                ? "cursor-default text-[11px] normal-case italic tracking-normal text-zinc-600"
                : isWinner
                  ? graded
                    ? correct
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300"
                    : "bg-orange-500/15 text-orange-400"
                  : winner
                    ? "text-zinc-600"
                    : "text-zinc-200"
            } ${clickable && team !== null ? "cursor-pointer hover:bg-zinc-800" : ""}`}
          >
            <span>{label}</span>
            {isWinner && <span className="text-[10px]">▸</span>}
          </button>
        );
      })}
    </div>
  );
}
