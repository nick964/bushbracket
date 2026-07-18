"use client";

import type { LeaderboardRow } from "@/lib/logic";
import { MAX_SCORE } from "@/lib/bracket";

export default function Leaderboard({
  rows,
  selected,
  onSelect,
}: {
  rows: LeaderboardRow[];
  selected?: string;
  onSelect?: (name: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No brackets were submitted.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-left font-display text-xs uppercase tracking-widest text-zinc-500">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Player</th>
            <th className="px-3 py-2 text-right font-semibold">Pts</th>
            <th className="px-3 py-2 text-right font-semibold">Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              onClick={() => onSelect?.(row.name)}
              className={`cursor-pointer border-t border-zinc-800/70 transition-colors ${
                selected === row.name
                  ? "bg-orange-500/10"
                  : "hover:bg-zinc-900"
              }`}
            >
              <td className="px-3 py-2 font-display font-bold text-zinc-500">
                {row.rank}
              </td>
              <td className="px-3 py-2 font-medium text-zinc-200">
                {row.name}
              </td>
              <td className="px-3 py-2 text-right font-display text-base font-bold text-orange-400">
                {row.score}
              </td>
              <td className="px-3 py-2 text-right text-zinc-500">
                {row.maxPossible}
                <span className="text-zinc-700"> / {MAX_SCORE}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
