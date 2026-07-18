"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ScoreboardPanel from "@/components/ScoreboardPanel";
import { type Decided, type Submission } from "@/lib/logic";

interface AppState {
  locked: boolean;
  results: Decided;
  submissions: Array<Submission | { name: string }>;
}

export default function ScoreboardPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setState(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    // setState happens after the fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-6">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-zinc-100 sm:text-4xl">
            <span className="text-orange-500">Scoreboard</span>
          </h1>
          <Link
            href="/"
            className="mt-1 shrink-0 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            ← Bracket
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          CDL Challengers Vegas · updates automatically as results come in
        </p>
      </header>

      {loadError && (
        <p className="mb-4 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Couldn&rsquo;t load the scoreboard — check your connection. Retrying…
        </p>
      )}

      {!state ? (
        <p className="animate-pulse text-sm text-zinc-500">
          Loading scoreboard…
        </p>
      ) : state.locked ? (
        <ScoreboardPanel
          submissions={state.submissions.filter(
            (s): s is Submission => "picks" in s
          )}
          results={state.results}
        />
      ) : (
        <WaitingView entrants={state.submissions.map((s) => s.name)} />
      )}
    </main>
  );
}

// Before the first result: show who's entered, but no scores or picks yet.
function WaitingView({ entrants }: { entrants: string[] }) {
  return (
    <div>
      <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-zinc-300">
          Tournament hasn&rsquo;t started
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Scores appear here once the first result is in. Brackets stay hidden
          until then — no copying!
        </p>
      </div>

      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-zinc-200">
        Entries ({entrants.length})
      </h2>
      {entrants.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nobody has submitted a bracket yet.{" "}
          <Link href="/" className="text-orange-400 underline">
            Be the first →
          </Link>
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {entrants.map((name) => (
            <li
              key={name}
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
