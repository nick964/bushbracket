"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import AuthControls from "@/components/AuthControls";
import BracketView from "@/components/BracketView";
import ScoreboardPanel from "@/components/ScoreboardPanel";
import { PREDICTABLE_GAMES, TEAMS, type GameId, type TeamId } from "@/lib/bracket";
import {
  normalizeName,
  predictableOnly,
  pruneDecided,
  type Decided,
  type Submission,
} from "@/lib/logic";

interface AppState {
  locked: boolean;
  results: Decided;
  /** The signed-in caller's own submission, if they've made one. */
  yours: Submission | null;
  submissions: Array<Submission | { name: string }>;
}

export default function Home() {
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
            EWC <span className="text-orange-500">Call of Duty</span>
          </h1>
          <span className="flex shrink-0 items-start gap-2">
            <Link
              href="/scoreboard"
              className="mt-1 shrink-0 rounded border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-orange-400 transition-colors hover:bg-orange-500/20"
            >
              Scoreboard →
            </Link>
            <AuthControls />
          </span>
        </div>
        <p className="mt-0.5 font-display text-lg font-semibold uppercase tracking-widest text-zinc-400">
          Bracket Challenge
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Esports World Cup · Aug 5–9 · two double-elim groups into single-elim
          playoffs · call every game, top score wins
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600">
          {Object.values(TEAMS).map((t) => (
            <span key={t.id}>
              <span className="font-semibold text-zinc-400">{t.name}</span>{" "}
              {t.fullName}
            </span>
          ))}
        </div>
      </header>

      {loadError && (
        <p className="mb-4 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Couldn&rsquo;t load the bracket — check your connection. Retrying…
        </p>
      )}

      {!state ? (
        <p className="animate-pulse text-sm text-zinc-500">Loading bracket…</p>
      ) : state.locked ? (
        <LockedView state={state} />
      ) : (
        <PickView state={state} onSubmitted={refresh} />
      )}
    </main>
  );
}

// ---------- Before lock: make picks & submit ----------

function PickView({
  state,
  onSubmitted,
}: {
  state: AppState;
  onSubmitted: () => void;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [picks, setPicks] = useState<Decided>({});
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set right after a successful POST so the confirmation shows without
  // waiting for the state refetch; the server's `yours` takes over after.
  const [justSubmitted, setJustSubmitted] = useState<{
    name: string;
    picks: Decided;
  } | null>(null);

  useEffect(() => {
    // Default the display name to the Clerk profile once it loads
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName((n) => n || user.fullName || user.username || "");
    }
  }, [user]);

  const saved = justSubmitted ?? state.yours;

  const handlePick = (game: GameId, team: TeamId) => {
    setError(null);
    setPicks((prev) => predictableOnly(pruneDecided({ ...prev, [game]: team })));
  };

  const pickedCount = PREDICTABLE_GAMES.filter((id) => picks[id]).length;
  const total = PREDICTABLE_GAMES.length;

  const takenNames = useMemo(
    () => new Set(state.submissions.map((s) => normalizeName(s.name))),
    [state.submissions]
  );
  const nameTaken = name.trim() !== "" && takenNames.has(normalizeName(name));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, picks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again");
        return;
      }
      setJustSubmitted({ name: data.name, picks: data.picks });
      onSubmitted();
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (saved) {
    return (
      <div>
        <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3">
          <p className="font-display text-lg font-bold uppercase text-emerald-300">
            Bracket locked in, {saved.name} ✓
          </p>
          <p className="mt-1 text-sm text-emerald-200/70">
            Your picks are saved to your account. The leaderboard appears here
            once the first real result is in.
          </p>
        </div>
        <BracketView decided={pruneDecided(saved.picks)} />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-400">
        Tap a team in each matchup to pick your winner. Winners advance
        automatically — fill out all {total} games, then submit.
      </p>

      <BracketView decided={pruneDecided(picks)} onPick={handlePick} />

      <div className="sticky bottom-0 mt-6 rounded-lg border border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Picks: <span className="text-orange-400">{pickedCount}</span>/{total}
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-800 sm:w-48">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${(pickedCount / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isLoaded && !isSignedIn ? (
            <SignInButton mode="modal">
              <button className="rounded bg-orange-500 px-6 py-2 font-display text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-orange-400 sm:ml-auto">
                Sign in to submit
              </button>
            </SignInButton>
          ) : (
            <>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                maxLength={30}
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-orange-500"
              />
              <button
                onClick={submit}
                disabled={
                  !isLoaded ||
                  submitting ||
                  pickedCount < total ||
                  name.trim() === "" ||
                  nameTaken
                }
                className="rounded bg-orange-500 px-6 py-2 font-display text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                {submitting ? "Submitting…" : "Submit bracket"}
              </button>
            </>
          )}
        </div>
        {isLoaded && !isSignedIn && (
          <p className="mt-2 text-xs text-zinc-500">
            You need an account to enter — your picks here are kept while you
            sign in.
          </p>
        )}
        {nameTaken && (
          <p className="mt-2 text-xs text-amber-400">
            A bracket was already submitted under that name — use a different
            one.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        {pickedCount < total && (
          <p className="mt-2 text-xs text-zinc-600">
            {total - pickedCount} game{total - pickedCount === 1 ? "" : "s"}{" "}
            left to pick.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- After lock: leaderboard + everyone's brackets ----------

function LockedView({ state }: { state: AppState }) {
  const submissions = useMemo(
    () => state.submissions.filter((s): s is Submission => "picks" in s),
    [state.submissions]
  );

  return (
    <div>
      <div className="mb-5 rounded-lg border border-orange-900/60 bg-orange-950/30 px-4 py-3">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-orange-300">
          🔒 Picks are locked — tournament in progress
        </p>
        <p className="mt-1 text-xs text-orange-200/60">
          Scores update as results come in. Tap a player to see their bracket.
        </p>
      </div>
      <ScoreboardPanel submissions={submissions} results={state.results} />
    </div>
  );
}
