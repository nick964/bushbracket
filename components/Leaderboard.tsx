"use client";

import type { LeaderboardRow } from "@/lib/logic";
import { MAX_SCORE } from "@/lib/bracket";

export default function Leaderboard({
  rows,
  selected,
  onSelect,
  maxScore = MAX_SCORE,
}: {
  rows: LeaderboardRow[];
  selected?: string;
  onSelect?: (name: string) => void;
  /** Denominator for the Max column (defaults to the EWC bracket's). */
  maxScore?: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No brackets were submitted.</p>
    );
  }

  return (
    <div className="overflow-hidden border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="label-caps bg-black/60 text-left text-zinc-500">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Operator</th>
            <th className="px-3 py-2 text-right">Pts</th>
            <th className="px-3 py-2 text-right">Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              onClick={() => onSelect?.(row.name)}
              className={`cursor-pointer border-t border-white/10 bg-[rgba(30,30,30,0.6)] transition-colors ${
                selected === row.name
                  ? "bg-orange-500/10"
                  : "hover:bg-white/5"
              }`}
            >
              <td
                className={`px-3 py-2 font-display font-bold ${
                  row.rank === 1 ? "text-amber-400" : "text-zinc-500"
                }`}
              >
                {row.rank === 1 ? "01" : String(row.rank).padStart(2, "0")}
              </td>
              <td className="px-3 py-2 font-medium text-zinc-200">
                {row.name}
                {row.paid && (
                  <span
                    title="Paid the buy-in — playing for the full pot"
                    className="ml-1.5"
                  >
                    💰
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-display text-base font-bold text-orange-400">
                {row.score}
              </td>
              <td className="px-3 py-2 text-right text-xs text-zinc-500">
                {row.maxPossible}
                <span className="text-zinc-700"> / {maxScore}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
