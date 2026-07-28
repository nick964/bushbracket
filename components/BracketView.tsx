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

interface Row {
  /** Small note shown above the row, e.g. explaining who drops into it. */
  note?: string;
  columns: Column[];
}

interface Section {
  phase: string;
  label: string;
  caption: string;
  rows: Row[];
}

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

const groupSection = (letter: "A" | "B", phase: string): Section => ({
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

const SECTIONS: Section[] = [
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
          <div className="label-caps mb-2 border border-white/10 bg-white/5 px-2 py-1.5 text-center text-zinc-400">
            {col.title}
          </div>
          <div className="flex flex-1 flex-col justify-around gap-3">
            {col.games.map((id) => (
              <GameCard
                key={id}
                gameId={id}
                slots={participants[id]}
                winner={decided[id] ?? GAMES[id].fixedResult?.winner}
                qualifier={QUALIFIER_GAMES.has(id)}
                gold={id === "GF"}
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
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <div key={section.label} className="space-y-3">
            <div className="min-w-max border-b border-white/10 pb-2">
              <p className="label-caps text-orange-500">{section.phase}</p>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-zinc-100">
                {section.label}
              </h2>
            </div>
            <p className="max-w-xl text-xs text-zinc-500">{section.caption}</p>
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
  );
}

function GameCard({
  gameId,
  slots,
  winner,
  qualifier,
  gold,
  onPick,
  onClear,
  actual,
}: {
  gameId: GameId;
  slots: [TeamId | null, TeamId | null];
  winner?: TeamId;
  /** Winner of this game claims a playoff spot. */
  qualifier?: boolean;
  /** Grand-final treatment: trophy gold instead of caution orange. */
  gold?: boolean;
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
            {gold ? "GF // The Decider" : gameId}
          </span>
          {qualifier && (
            <span
              title="Winner qualifies for the playoffs"
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
        const label = team ? TEAMS[team].name : slotLabel(game.slots[i]);
        return (
          <button
            key={i}
            disabled={!clickable || team === null}
            title={team ? TEAMS[team].fullName : undefined}
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
