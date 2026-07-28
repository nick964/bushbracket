"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthControls from "@/components/AuthControls";
import PotBanner from "@/components/PotBanner";
import ScoreboardPanel from "@/components/ScoreboardPanel";
import WinnersBanner from "@/components/WinnersBanner";
import { type Decided, type Submission } from "@/lib/logic";

interface AppState {
  locked: boolean;
  completed: boolean;
  pot: number;
  results: Decided;
  submissions: Array<Submission | { name: string; paid?: boolean }>;
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
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <p className="mt-1 font-display text-xl font-bold uppercase tracking-tighter text-orange-500">
            COD <span className="text-zinc-500">{"//"}</span> EWC
          </p>
          <span className="flex shrink-0 items-start gap-2">
            <Link
              href="/"
              className="label-caps mt-1 shrink-0 border border-white/15 bg-black/40 px-3 py-2 text-zinc-300 transition-colors hover:border-orange-500 hover:text-orange-400"
            >
              ← Bracket
            </Link>
            <AuthControls />
          </span>
        </div>
        <div className="mt-5">
          <p className="label-caps text-orange-500">Live Standings</p>
          <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tighter text-zinc-100 sm:text-4xl">
            Score<span className="text-orange-500">board</span>
          </h1>
          <p className="label-caps mt-2 text-zinc-500">
            Updates automatically as results come in
          </p>
        </div>
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
      ) : (
        <>
          {state.completed && state.locked ? (
            <WinnersBanner
              pot={state.pot}
              submissions={state.submissions.filter(
                (s): s is Submission => "picks" in s
              )}
              results={state.results}
            />
          ) : (
            <PotBanner pot={state.pot} />
          )}
          {state.locked ? (
            <ScoreboardPanel
              submissions={state.submissions.filter(
                (s): s is Submission => "picks" in s
              )}
              results={state.results}
            />
          ) : (
            <WaitingView entrants={state.submissions.map((s) => s.name)} />
          )}
        </>
      )}
    </main>
  );
}

// Before the first result: show who's entered, but no scores or picks yet.
function WaitingView({ entrants }: { entrants: string[] }) {
  return (
    <div>
      <div className="relative mb-5 border border-white/15 bg-[#1e2020] px-4 py-3">
        <span className="hud-corner hud-corner-tl opacity-50" />
        <span className="hud-corner hud-corner-br opacity-50" />
        <p className="label-caps text-zinc-300">
          Standby — Tournament hasn&rsquo;t started
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
