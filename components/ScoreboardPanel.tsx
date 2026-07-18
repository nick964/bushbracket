"use client";

import { useMemo, useState } from "react";
import BracketView from "@/components/BracketView";
import Leaderboard from "@/components/Leaderboard";
import {
  computeLeaderboard,
  pruneDecided,
  type Decided,
  type Submission,
} from "@/lib/logic";

// Leaderboard + live-results/player-bracket viewer, shown once picks are
// locked. Used on both the main page and /scoreboard.
export default function ScoreboardPanel({
  submissions,
  results,
}: {
  submissions: Submission[];
  results: Decided;
}) {
  const rows = useMemo(
    () => computeLeaderboard(submissions, results),
    [submissions, results]
  );
  const [view, setView] = useState<string>("__results__");

  const selectedSub = submissions.find((s) => s.name === view);
  const actual = pruneDecided(results);

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-zinc-200">
        Leaderboard
      </h2>
      <Leaderboard
        rows={rows}
        selected={selectedSub?.name}
        onSelect={(n) => setView(n)}
      />

      <div className="mt-6 mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-200">
          {selectedSub ? `${selectedSub.name}'s bracket` : "Live results"}
        </h2>
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="ml-auto rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-orange-500"
        >
          <option value="__results__">Live results</option>
          {submissions.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSub ? (
        <BracketView
          decided={pruneDecided(selectedSub.picks)}
          compare={actual}
        />
      ) : (
        <BracketView decided={actual} />
      )}
    </div>
  );
}
