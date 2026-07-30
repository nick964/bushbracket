"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import AuthControls from "@/components/AuthControls";
import Leaderboard from "@/components/Leaderboard";
import LcqBracketView from "@/components/LcqBracketView";
import LcqPotBanner from "@/components/LcqPotBanner";
import * as engine from "@/lib/engine";
import { normalizeName } from "@/lib/engine";
import {
  LCQ_DEF,
  LCQ_MAX_SCORE,
  LCQ_ORDER,
  LCQ_TEAMS,
  type LcqDecided,
  type LcqGameId,
  type LcqSubmission,
  type LcqTeamId,
} from "@/lib/lcq";

interface LcqState {
  locked: boolean;
  completed: boolean;
  pot: number;
  buyIn: number;
  potsHidden: boolean;
  results: LcqDecided;
  /** The signed-in caller's own submission, if they've made one. */
  yours: LcqSubmission | null;
  submissions: Array<LcqSubmission | { name: string; paid?: boolean }>;
}

export default function LcqPage() {
  const [state, setState] = useState<LcqState | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/lcq/state", { cache: "no-store" });
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
            COD <span className="text-zinc-500">{"//"}</span> LCQ
          </p>
          <span className="flex shrink-0 items-start gap-2">
            <Link
              href="/"
              className="label-caps mt-1 shrink-0 border border-white/15 bg-black/40 px-3 py-2 text-zinc-300 transition-colors hover:border-orange-500 hover:text-orange-400"
            >
              ← EWC Bracket
            </Link>
            <AuthControls />
          </span>
        </div>
        <div className="mt-5">
          <span className="label-caps inline-block bg-orange-500 px-2 py-1 text-black">
            Side Mission
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tighter text-zinc-100 sm:text-5xl">
            Last Chance <span className="text-orange-500">Qualifier</span>
          </h1>
          <p className="label-caps mt-2 text-zinc-500">
            Jul 31 – Aug 2 · 16 teams · Double elimination · Winner reaches the
            EWC
          </p>
          {state && !state.potsHidden && (
            <p className="mt-2 text-xs text-zinc-500">
              Free to enter — throw in ${state.buyIn} if you want in on the
              buy-in pot.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-600">
          {Object.values(LCQ_TEAMS).map((t) => (
            <span key={t.id}>
              <span className="font-bold text-zinc-400">{t.name}</span>{" "}
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
      ) : (
        <>
          {state.completed && state.locked ? (
            <ChampBanner state={state} />
          ) : (
            !state.potsHidden && (
              <LcqPotBanner pot={state.pot} buyIn={state.buyIn} />
            )
          )}
          {state.locked ? (
            <LockedView state={state} />
          ) : (
            <PickView state={state} onSubmitted={refresh} />
          )}
        </>
      )}
    </main>
  );
}

// ---------- After completion: champion + payout banner ----------

function ChampBanner({ state }: { state: LcqState }) {
  const submissions = state.submissions.filter(
    (s): s is LcqSubmission => "picks" in s
  );
  const rows = engine.computeLeaderboard(LCQ_DEF, submissions, state.results);
  const champs = rows.filter((r) => r.rank === 1);
  const paidRows = rows.filter((r) => r.paid);
  const topPaid =
    paidRows.length > 0
      ? paidRows.filter((r) => r.score === paidRows[0].score)
      : [];
  const qualified = state.results.GF;

  if (champs.length === 0) return null;
  const names = (list: typeof rows) => list.map((r) => r.name).join(" & ");

  // The whole pot is buy-ins, so a paid champion takes everything; otherwise
  // the champion gets the bragging rights and the top paid player the money.
  const sweep = state.pot > 0 && champs.every((c) => c.paid);
  const splitPot = topPaid.length > 1 ? "split" : "takes";

  return (
    <div className="relative mb-6 border border-amber-500 bg-[#1e2020] px-4 py-4 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
      <span className="hud-corner hud-corner-gold hud-corner-tl" />
      <span className="hud-corner hud-corner-gold hud-corner-tr" />
      <span className="hud-corner hud-corner-gold hud-corner-bl" />
      <span className="hud-corner hud-corner-gold hud-corner-br" />
      <p className="label-caps text-amber-500">
        Final Results // Mission Complete
      </p>
      {sweep ? (
        <p className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-amber-300">
          🏆 {names(champs)} {champs.length > 1 ? "split" : "wins"} the whole $
          {state.pot} pot!
        </p>
      ) : (
        <div className="mt-1 space-y-1">
          <p className="font-display text-2xl font-bold uppercase tracking-tight text-amber-300">
            🏆 {names(champs)} {champs.length > 1 ? "share" : "takes"} the
            bragging rights
          </p>
          {state.pot > 0 && topPaid.length > 0 && (
            <p className="text-sm text-amber-200/80">
              💰 Top paid player{topPaid.length > 1 ? "s" : ""}:{" "}
              <span className="font-semibold text-amber-300">
                {names(topPaid)}
              </span>{" "}
              {splitPot} the ${state.pot} pot.
            </p>
          )}
        </div>
      )}
      {qualified && (
        <p className="mt-1 text-sm text-amber-200/80">
          {LCQ_TEAMS[qualified].fullName} wins the LCQ and advances to the
          Esports World Cup.
        </p>
      )}
      {state.pot > 0 && (
        <p className="label-caps mt-3 text-amber-200/50">
          Payouts via Venmo · Thanks for playing
        </p>
      )}
    </div>
  );
}

// ---------- Before lock: make picks & submit ----------

function PickView({
  state,
  onSubmitted,
}: {
  state: LcqState;
  onSubmitted: () => void;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [picks, setPicks] = useState<LcqDecided>({});
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set right after a successful POST so the confirmation shows without
  // waiting for the state refetch; the server's `yours` takes over after.
  const [justSubmitted, setJustSubmitted] = useState<{
    name: string;
    picks: LcqDecided;
  } | null>(null);

  useEffect(() => {
    // Default the display name to the Clerk profile once it loads
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName((n) => n || user.fullName || user.username || "");
    }
  }, [user]);

  const saved = justSubmitted ?? state.yours;

  const handlePick = (game: LcqGameId, team: LcqTeamId) => {
    setError(null);
    setPicks((prev) =>
      engine.predictableOnly(
        LCQ_DEF,
        engine.pruneDecided(LCQ_DEF, { ...prev, [game]: team })
      )
    );
  };

  const pickedCount = LCQ_ORDER.filter((id) => picks[id]).length;
  const total = LCQ_ORDER.length;

  const takenNames = useMemo(
    () => new Set(state.submissions.map((s) => normalizeName(s.name))),
    [state.submissions]
  );
  const nameTaken = name.trim() !== "" && takenNames.has(normalizeName(name));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lcq/submit", {
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
        <div className="relative mb-5 border border-emerald-500/60 bg-[#1e2020] px-4 py-3">
          <span className="hud-corner hud-corner-tl !border-emerald-500" />
          <span className="hud-corner hud-corner-br !border-emerald-500" />
          <p className="label-caps text-emerald-400">
            ● Selections Confirmed
          </p>
          <p className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-emerald-300">
            LCQ bracket locked in, {saved.name}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Your picks are saved to your account. The leaderboard appears here
            once the first real result is in.
          </p>
        </div>
        <LcqBracketView decided={engine.pruneDecided(LCQ_DEF, saved.picks)} />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-400">
        Tap a team in each matchup to pick your winner. Winners advance (and
        losers drop to the lower bracket) automatically — fill out all {total}{" "}
        games, then submit.
      </p>

      <LcqBracketView
        decided={engine.pruneDecided(LCQ_DEF, picks)}
        onPick={handlePick}
      />

      <div className="sticky bottom-0 mt-6 border border-white/10 bg-black/90 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="label-caps text-zinc-400">
            Picks: <span className="text-orange-400">{pickedCount}</span> /{" "}
            {total}
          </span>
          <div className="flex h-1 w-32 gap-0.5 sm:w-48">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={`h-full flex-1 transition-colors ${
                  i < Math.floor((pickedCount / total) * 10)
                    ? "bg-orange-500"
                    : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isLoaded && !isSignedIn ? (
            <SignInButton mode="modal">
              <button className="btn-clip bg-orange-500 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-black transition-all hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] sm:ml-auto">
                Sign in to submit
              </button>
            </SignInButton>
          ) : (
            <>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CALLSIGN / DISPLAY NAME"
                maxLength={30}
                className="flex-1 border-b border-white/20 bg-[#050505] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-orange-500"
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
                className="btn-clip bg-orange-500 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-black transition-all hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:hover:shadow-none"
              >
                {submitting ? "Submitting…" : "Submit Selections"}
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

function LockedView({ state }: { state: LcqState }) {
  const submissions = useMemo(
    () => state.submissions.filter((s): s is LcqSubmission => "picks" in s),
    [state.submissions]
  );
  const rows = useMemo(
    () => engine.computeLeaderboard(LCQ_DEF, submissions, state.results),
    [submissions, state.results]
  );
  const [view, setView] = useState<string>("__results__");

  const selectedSub = submissions.find((s) => s.name === view);
  const actual = engine.pruneDecided(LCQ_DEF, state.results);

  return (
    <div>
      {!state.completed && (
        <div className="relative mb-5 border border-orange-500/50 bg-[#1e2020] px-4 py-3">
          <span className="hud-corner hud-corner-tl" />
          <span className="hud-corner hud-corner-br" />
          <p className="label-caps flex items-center gap-2 text-orange-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse bg-orange-500" />
            Picks locked — LCQ in progress
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Scores update as results come in. Tap a player to see their bracket.
          </p>
        </div>
      )}

      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-zinc-200">
        Leaderboard
      </h2>
      <Leaderboard
        rows={rows}
        maxScore={LCQ_MAX_SCORE}
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
        <LcqBracketView
          decided={engine.pruneDecided(LCQ_DEF, selectedSub.picks)}
          compare={actual}
        />
      ) : (
        <LcqBracketView decided={actual} />
      )}
    </div>
  );
}
