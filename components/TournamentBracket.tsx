"use client";

// Tournament-agnostic bracket renderer. Bind it to a tournament with the
// def/teams/sections props — see BracketView (EWC) and LcqBracketView (LCQ).

import {
  resolveParticipants,
  slotLabel,
  type BracketDef,
  type DecidedMap,
} from "@/lib/engine";

export interface Column<G extends string> {
  title: string;
  games: G[];
}

export interface Row<G extends string> {
  /** Small note shown above the row, e.g. explaining who drops into it. */
  note?: string;
  columns: Column<G>[];
}

export interface Section<G extends string> {
  phase: string;
  label: string;
  caption: string;
  rows: Row<G>[];
}

export interface TournamentBracketProps<G extends string, T extends string> {
  def: BracketDef<G, T>;
  teams: Record<T, { name: string; fullName: string }>;
  sections: Section<G>[];
  /** Games whose winner claims a qualifying spot — marked with a "Q" badge. */
  qualifierGames?: ReadonlySet<G>;
  /** Hover text for the "Q" badge. */
  qualifierTitle?: string;
  /** Game that gets the trophy-gold treatment (the grand final). */
  goldGame?: G;
  /** Header label for the gold game, e.g. "GF // The Decider". */
  goldLabel?: string;
  /** Winners to display (fixed pre-completed results are always shown regardless). */
  decided: DecidedMap<G, T>;
  /** Click a team to pick/set a winner. Omit for read-only display. */
  onPick?: (game: G, team: T) => void;
  /** Undo button on decided games (admin). */
  onClear?: (game: G) => void;
  /** Actual results to grade `decided` against (green/red). */
  compare?: DecidedMap<G, T>;
}

export default function TournamentBracket<G extends string, T extends string>({
  def,
  teams,
  sections,
  qualifierGames,
  qualifierTitle,
  goldGame,
  goldLabel,
  decided,
  onPick,
  onClear,
  compare,
}: TournamentBracketProps<G, T>) {
  const participants = resolveParticipants(def, decided);

  const card = (id: G) => (
    <GameCard
      key={id}
      def={def}
      teams={teams}
      gameId={id}
      slots={participants[id]}
      winner={decided[id] ?? def.games[id].fixedResult?.winner}
      qualifier={qualifierGames?.has(id)}
      qualifierTitle={qualifierTitle}
      gold={id === goldGame}
      goldLabel={goldLabel}
      onPick={onPick}
      onClear={onClear}
      actual={compare?.[id]}
    />
  );

  // How many games in a round already have a winner (picked or fixed).
  const doneCount = (games: G[]) =>
    games.filter((id) => decided[id] ?? def.games[id].fixedResult).length;

  const renderColumns = (columns: Column<G>[]) => (
    <div className="flex min-w-max gap-3 sm:gap-4">
      {columns.map((col) => (
        <div key={col.title} className="flex w-40 sm:w-48 flex-col">
          <div className="label-caps mb-2 border border-white/10 bg-white/5 px-2 py-1.5 text-center text-zinc-400">
            {col.title}
          </div>
          <div className="flex flex-1 flex-col justify-around gap-3">
            {col.games.map(card)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop / tablet: classic side-by-side bracket, scrolls sideways */}
      <div className="hidden overflow-x-auto pb-2 sm:block">
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.label} className="space-y-3">
              <div className="min-w-max border-b border-white/10 pb-2">
                <p className="label-caps text-orange-500">{section.phase}</p>
                <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-zinc-100">
                  {section.label}
                </h2>
              </div>
              <p className="max-w-xl text-xs text-zinc-500">
                {section.caption}
              </p>
              {section.rows.map((row, i) => (
                <div key={i} className="space-y-1.5">
                  {row.note && (
                    <p className="label-caps text-zinc-600">↓ {row.note}</p>
                  )}
                  {renderColumns(row.columns)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Phone: rounds stacked top-to-bottom, full-width cards, no
          side-scrolling. Each round header shows its picked/total count. */}
      <div className="space-y-8 sm:hidden">
        {sections.map((section) => (
          <div key={section.label} className="space-y-4">
            <div className="border-b border-white/10 pb-2">
              <p className="label-caps text-orange-500">{section.phase}</p>
              <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-zinc-100">
                {section.label}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">{section.caption}</p>
            </div>
            {section.rows.map((row, i) => (
              <div key={i} className="space-y-4">
                {row.note && (
                  <p className="label-caps text-zinc-600">↓ {row.note}</p>
                )}
                {row.columns.map((col) => (
                  <div key={col.title}>
                    <div className="label-caps mb-2 flex items-center justify-between border border-white/10 bg-white/5 px-2.5 py-1.5 text-zinc-400">
                      <span>{col.title}</span>
                      <span
                        className={
                          doneCount(col.games) === col.games.length
                            ? "text-emerald-400"
                            : "text-zinc-600"
                        }
                      >
                        {doneCount(col.games)}/{col.games.length}
                      </span>
                    </div>
                    <div className="space-y-2">{col.games.map(card)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function GameCard<G extends string, T extends string>({
  def,
  teams,
  gameId,
  slots,
  winner,
  qualifier,
  qualifierTitle,
  gold,
  goldLabel,
  onPick,
  onClear,
  actual,
}: {
  def: BracketDef<G, T>;
  teams: Record<T, { name: string; fullName: string }>;
  gameId: G;
  slots: [T | null, T | null];
  winner?: T;
  /** Winner of this game claims a qualifying spot. */
  qualifier?: boolean;
  qualifierTitle?: string;
  /** Grand-final treatment: trophy gold instead of caution orange. */
  gold?: boolean;
  goldLabel?: string;
  onPick?: (game: G, team: T) => void;
  onClear?: (game: G) => void;
  actual?: T;
}) {
  const game = def.games[gameId];
  const isFixed = Boolean(game.fixedResult);
  const bothKnown = slots[0] !== null && slots[1] !== null;
  const clickable = Boolean(onPick) && !isFixed && bothKnown;

  // Grade this game's pick when actual results are provided
  const graded = !isFixed && actual !== undefined && winner !== undefined;
  const correct = graded && winner === actual;

  const borderClass = graded
    ? correct
      ? "border-emerald-500/70"
      : "border-red-500/70"
    : gold
      ? "border-amber-500/80 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
      : winner && !isFixed
        ? "border-orange-500/60"
        : "border-white/10";

  return (
    <div
      className={`relative overflow-hidden border bg-[rgba(30,30,30,0.6)] backdrop-blur-md ${borderClass}`}
    >
      {gold ? (
        <>
          <span className="hud-corner hud-corner-gold hud-corner-tl" />
          <span className="hud-corner hud-corner-gold hud-corner-tr" />
          <span className="hud-corner hud-corner-gold hud-corner-bl" />
          <span className="hud-corner hud-corner-gold hud-corner-br" />
        </>
      ) : (
        <>
          <span className="hud-corner hud-corner-tl opacity-50" />
          <span className="hud-corner hud-corner-br opacity-50" />
        </>
      )}
      <div
        className={`flex items-center justify-between border-b px-2 py-1 ${
          gold ? "border-amber-500/30 bg-black/40" : "border-white/10 bg-black/40"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`label-caps ${gold ? "text-amber-500" : "text-zinc-500"}`}
          >
            {gold ? goldLabel ?? gameId : gameId}
          </span>
          {qualifier && (
            <span
              title={qualifierTitle}
              className="label-caps bg-emerald-500/15 px-1 py-0.5 text-emerald-400"
            >
              Q
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {graded && (
            <span
              className={`label-caps ${correct ? "text-emerald-400" : "text-red-400"}`}
            >
              {correct ? `+${game.points}` : "✗"}
            </span>
          )}
          {!isFixed && (
            <span
              className={`label-caps ${gold ? "text-amber-500/80" : "text-orange-500/80"}`}
            >
              {game.points} PT{game.points === 1 ? "" : "S"}
            </span>
          )}
          {isFixed && (
            <span className="label-caps text-zinc-600">
              {game.fixedResult!.score}
            </span>
          )}
          {onClear && winner && !isFixed && (
            <button
              onClick={() => onClear(gameId)}
              className="label-caps bg-white/10 px-1.5 py-0.5 text-zinc-300 hover:bg-red-900/60 hover:text-red-200"
              title="Undo this result"
            >
              undo
            </button>
          )}
        </span>
      </div>
      {slots.map((team, i) => {
        const isWinner = team !== null && winner === team;
        const label = team ? teams[team].name : slotLabel(game.slots[i]);
        return (
          <button
            key={i}
            disabled={!clickable || team === null}
            title={team ? teams[team].fullName : undefined}
            onClick={() => team && onPick?.(gameId, team)}
            className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
              i === 0 ? "border-b border-white/10" : ""
            } ${clickable && team !== null ? "cursor-pointer hover:bg-white/5" : ""}`}
          >
            <span
              className={`h-6 w-1 shrink-0 ${
                isWinner
                  ? graded
                    ? correct
                      ? "bg-emerald-500"
                      : "bg-red-500"
                    : gold
                      ? "bg-amber-500"
                      : "bg-orange-500"
                  : "bg-zinc-700"
              }`}
            />
            <span
              className={`flex-1 font-display text-sm font-semibold uppercase tracking-wide ${
                team === null
                  ? "text-[11px] font-normal normal-case italic tracking-normal text-zinc-600"
                  : isWinner
                    ? graded
                      ? correct
                        ? "text-emerald-300"
                        : "text-red-300"
                      : gold
                        ? "text-amber-300"
                        : "text-orange-400"
                    : winner
                      ? "text-zinc-600"
                      : "text-zinc-200"
              }`}
            >
              {label}
            </span>
            {isWinner && (
              <span
                className={`text-[10px] ${
                  graded
                    ? correct
                      ? "text-emerald-400"
                      : "text-red-400"
                    : gold
                      ? "text-amber-400"
                      : "text-orange-500"
                }`}
              >
                ◉
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
