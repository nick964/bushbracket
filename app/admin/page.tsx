"use client";

import { useCallback, useEffect, useState } from "react";
import BracketView from "@/components/BracketView";
import LcqBracketView from "@/components/LcqBracketView";
import { PREDICTABLE_GAMES, type GameId, type TeamId } from "@/lib/bracket";
import {
  predictableOnly,
  pruneDecided,
  scoreSubmission,
  type Decided,
} from "@/lib/logic";
import * as engine from "@/lib/engine";
import {
  LCQ_DEF,
  LCQ_ORDER,
  type LcqDecided,
  type LcqGameId,
  type LcqTeamId,
} from "@/lib/lcq";
import type { StoredLcqSubmission, StoredSubmission } from "@/lib/store";

const PW_KEY = "bushbracket-admin-pw";

type Tournament = "ewc" | "lcq";

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament>("ewc");

  useEffect(() => {
    // sessionStorage is only readable client-side — one-time hydration read
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassword(sessionStorage.getItem(PW_KEY));
  }, []);

  const onAuthFailure = () => {
    sessionStorage.removeItem(PW_KEY);
    setPassword(null);
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-6">
      <header className="mb-6">
        <p className="label-caps text-orange-500">Command Console</p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tighter text-zinc-100">
          Admin <span className="text-orange-500">{"// Results"}</span>
        </h1>
        <p className="mt-2 text-xs text-zinc-500">
          Click the actual winner as each game finishes. Entering the first
          result locks everyone&rsquo;s picks (per tournament).
        </p>
      </header>
      {password === null ? (
        <Login
          onSuccess={(pw) => {
            sessionStorage.setItem(PW_KEY, pw);
            setPassword(pw);
          }}
        />
      ) : (
        <>
          <div className="mb-5 flex gap-2">
            {(
              [
                ["ewc", "EWC Main Event"],
                ["lcq", "Last Chance Qualifier"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTournament(key)}
                className={`rounded px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                  tournament === key
                    ? "bg-orange-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tournament === "ewc" ? (
            <ResultsEditor password={password} onAuthFailure={onAuthFailure} />
          ) : (
            <LcqEditor password={password} onAuthFailure={onAuthFailure} />
          )}
        </>
      )}
    </main>
  );
}

function Login({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value, action: "login" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      onSuccess(value);
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Admin password"
        autoFocus
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-orange-500"
      />
      <button
        type="submit"
        disabled={busy || value === ""}
        className="rounded bg-orange-500 px-6 py-2 font-display text-sm font-bold uppercase tracking-wider text-black hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600"
      >
        {busy ? "Checking…" : "Enter"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

function ResultsEditor({
  password,
  onAuthFailure,
}: {
  password: string;
  onAuthFailure: () => void;
}) {
  const [results, setResults] = useState<Decided | null>(null);
  const [manualLock, setManualLock] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [pot, setPot] = useState(0);
  const [potDraft, setPotDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results);
      setManualLock(Boolean(data.manualLock));
      setCompleted(Boolean(data.completed));
      setPot(data.pot);
      setPotDraft(String(data.pot));
    } catch {
      setError("Couldn't load current results — refresh the page");
    }
  }, []);

  useEffect(() => {
    // setState happens after the fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const mutate = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...body }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onAuthFailure();
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      if (data.results !== undefined) setResults(data.results);
      if (data.manualLock !== undefined) setManualLock(data.manualLock);
      if (data.completed !== undefined) setCompleted(data.completed);
      if (data.pot !== undefined) {
        setPot(data.pot);
        setPotDraft(String(data.pot));
      }
    } catch {
      setError("Network error — the result was NOT saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (results === null) {
    return <p className="animate-pulse text-sm text-zinc-500">Loading…</p>;
  }

  const resultCount = Object.keys(predictableOnly(results)).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm">
        <span className="font-display font-semibold uppercase tracking-wider text-zinc-300">
          {completed
            ? "🏆 Tournament complete — winners are displayed"
            : resultCount > 0
              ? `${resultCount}/${PREDICTABLE_GAMES.length} results entered — picks locked`
              : manualLock
                ? "Submissions locked by admin — no results yet"
                : "No results yet — picks still open"}
        </span>
        {(completed || resultCount === PREDICTABLE_GAMES.length) && (
          <button
            onClick={() =>
              mutate({ action: completed ? "uncomplete" : "complete" })
            }
            disabled={busy}
            className={`rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              completed
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {completed ? "Reopen tournament" : "Mark tournament complete"}
          </button>
        )}
        {!completed && resultCount === 0 && (
          <button
            onClick={() =>
              mutate({ action: manualLock ? "unlock" : "lock" })
            }
            disabled={busy}
            className={`rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              manualLock
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "bg-orange-500 text-black hover:bg-orange-400"
            }`}
          >
            {manualLock ? "Unlock submissions" : "Lock submissions"}
          </button>
        )}
        {busy && <span className="text-xs text-zinc-500">Saving…</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm">
        <span className="font-display font-semibold uppercase tracking-wider text-emerald-300">
          💰 Paid pot: ${pot}
        </span>
        <span className="flex items-center gap-1 text-zinc-300">
          $
          <input
            type="number"
            min={0}
            value={potDraft}
            onChange={(e) => setPotDraft(e.target.value)}
            className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-emerald-500"
          />
        </span>
        <button
          onClick={() => mutate({ action: "set-pot", amount: Number(potDraft) })}
          disabled={
            busy ||
            potDraft.trim() === "" ||
            !Number.isFinite(Number(potDraft)) ||
            Number(potDraft) < 0 ||
            Math.round(Number(potDraft)) === pot
          }
          className="rounded bg-emerald-600 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          Update pot
        </button>
        <span className="text-xs text-zinc-500">
          Bump it +$5 as each Venmo buy-in lands. The free pot is fixed at $30.
        </span>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Click a team to record the real winner — they advance automatically.
        Use <span className="font-semibold text-zinc-300">undo</span> on a game
        to correct a mistake; anything downstream of it is cleared too.
      </p>

      <BracketView
        decided={pruneDecided(results)}
        onPick={(gameId: GameId, winner: TeamId) =>
          mutate({ action: "set", gameId, winner })
        }
        onClear={(gameId: GameId) => mutate({ action: "clear", gameId })}
      />

      <EntriesPanel
        password={password}
        results={results}
        onAuthFailure={onAuthFailure}
      />
    </div>
  );
}

// ---------- Submitted entries: view & delete ----------

function EntriesPanel({
  password,
  results,
  onAuthFailure,
}: {
  password: string;
  results: Decided;
  onAuthFailure: () => void;
}) {
  const [entries, setEntries] = useState<StoredSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...body }),
      });
      if (res.status === 401) {
        onAuthFailure();
        throw new Error("unauthorized");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    },
    [password, onAuthFailure]
  );

  const load = useCallback(async () => {
    try {
      const data = await call({ action: "entries" });
      setEntries(data.submissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load entries");
    }
  }, [call]);

  useEffect(() => {
    // setState happens after the fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = async (id: string) => {
    setConfirming(null);
    try {
      await call({ action: "delete-entry", id });
      if (viewing === id) setViewing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const togglePaid = async (entry: StoredSubmission) => {
    try {
      await call({ action: "set-paid", id: entry.id, paid: !entry.paid });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update paid status");
    }
  };

  const hasResults = Object.keys(predictableOnly(results)).length > 0;
  const viewingEntry = entries?.find((e) => e.id === viewing);

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-zinc-200">
        Entries{entries ? ` (${entries.length})` : ""}
      </h2>
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      {entries === null ? (
        <p className="animate-pulse text-sm text-zinc-500">Loading entries…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No brackets submitted yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center gap-2 border-b border-zinc-800/70 px-3 py-2 text-sm last:border-b-0 odd:bg-zinc-900/40"
            >
              <span className="font-medium text-zinc-200">{entry.name}</span>
              <span className="text-xs text-zinc-600">
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {hasResults &&
                  ` · ${scoreSubmission(entry.picks, results)} pts`}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => togglePaid(entry)}
                  title={
                    entry.paid
                      ? "Marked paid — click to unmark"
                      : "Mark this player's buy-in as received"
                  }
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    entry.paid
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {entry.paid ? "💰 Paid" : "Mark paid"}
                </button>
                <button
                  onClick={() =>
                    setViewing(viewing === entry.id ? null : entry.id)
                  }
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  {viewing === entry.id ? "Hide" : "View"}
                </button>
                {confirming === entry.id ? (
                  <>
                    <button
                      onClick={() => remove(entry.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                    >
                      Confirm delete
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(entry.id)}
                    className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-900/60"
                  >
                    Delete
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {viewingEntry && (
        <div className="mt-4">
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {viewingEntry.name}&rsquo;s bracket
          </h3>
          <BracketView
            decided={pruneDecided(viewingEntry.picks)}
            compare={hasResults ? pruneDecided(results) : undefined}
          />
        </div>
      )}
    </section>
  );
}

// ---------- LCQ: results editor + entries (no pot / paid handling) ----------

function LcqEditor({
  password,
  onAuthFailure,
}: {
  password: string;
  onAuthFailure: () => void;
}) {
  const [results, setResults] = useState<LcqDecided | null>(null);
  const [manualLock, setManualLock] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [pot, setPot] = useState(0);
  const [potDraft, setPotDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lcq/state", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results);
      setManualLock(Boolean(data.manualLock));
      setCompleted(Boolean(data.completed));
      setPot(data.pot);
      setPotDraft(String(data.pot));
    } catch {
      setError("Couldn't load current results — refresh the page");
    }
  }, []);

  useEffect(() => {
    // setState happens after the fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const mutate = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, tournament: "lcq", ...body }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onAuthFailure();
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      if (data.results !== undefined) setResults(data.results);
      if (data.manualLock !== undefined) setManualLock(data.manualLock);
      if (data.completed !== undefined) setCompleted(data.completed);
      if (data.pot !== undefined) {
        setPot(data.pot);
        setPotDraft(String(data.pot));
      }
    } catch {
      setError("Network error — the result was NOT saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (results === null) {
    return <p className="animate-pulse text-sm text-zinc-500">Loading…</p>;
  }

  const resultCount = Object.keys(
    engine.predictableOnly(LCQ_DEF, results)
  ).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm">
        <span className="font-display font-semibold uppercase tracking-wider text-zinc-300">
          {completed
            ? "🏆 LCQ complete — winners are displayed"
            : resultCount > 0
              ? `${resultCount}/${LCQ_ORDER.length} results entered — picks locked`
              : manualLock
                ? "Submissions locked by admin — no results yet"
                : "No results yet — picks still open"}
        </span>
        {(completed || resultCount === LCQ_ORDER.length) && (
          <button
            onClick={() =>
              mutate({ action: completed ? "uncomplete" : "complete" })
            }
            disabled={busy}
            className={`rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              completed
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {completed ? "Reopen LCQ" : "Mark LCQ complete"}
          </button>
        )}
        {!completed && resultCount === 0 && (
          <button
            onClick={() => mutate({ action: manualLock ? "unlock" : "lock" })}
            disabled={busy}
            className={`rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              manualLock
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "bg-orange-500 text-black hover:bg-orange-400"
            }`}
          >
            {manualLock ? "Unlock submissions" : "Lock submissions"}
          </button>
        )}
        {busy && <span className="text-xs text-zinc-500">Saving…</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm">
        <span className="font-display font-semibold uppercase tracking-wider text-emerald-300">
          💰 LCQ pot: ${pot}
        </span>
        <span className="flex items-center gap-1 text-zinc-300">
          $
          <input
            type="number"
            min={0}
            value={potDraft}
            onChange={(e) => setPotDraft(e.target.value)}
            className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-emerald-500"
          />
        </span>
        <button
          onClick={() => mutate({ action: "set-pot", amount: Number(potDraft) })}
          disabled={
            busy ||
            potDraft.trim() === "" ||
            !Number.isFinite(Number(potDraft)) ||
            Number(potDraft) < 0 ||
            Math.round(Number(potDraft)) === pot
          }
          className="rounded bg-emerald-600 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          Update pot
        </button>
        <span className="text-xs text-zinc-500">
          Buy-ins only — starts at $0, bump it +$5 as each Venmo lands.
        </span>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Click a team to record the real winner — they advance (and losers drop
        to the lower bracket) automatically. Use{" "}
        <span className="font-semibold text-zinc-300">undo</span> on a game to
        correct a mistake; anything downstream of it is cleared too.
      </p>

      <LcqBracketView
        decided={engine.pruneDecided(LCQ_DEF, results)}
        onPick={(gameId: LcqGameId, winner: LcqTeamId) =>
          mutate({ action: "set", gameId, winner })
        }
        onClear={(gameId: LcqGameId) => mutate({ action: "clear", gameId })}
      />

      <LcqEntriesPanel
        password={password}
        results={results}
        onAuthFailure={onAuthFailure}
      />
    </div>
  );
}

function LcqEntriesPanel({
  password,
  results,
  onAuthFailure,
}: {
  password: string;
  results: LcqDecided;
  onAuthFailure: () => void;
}) {
  const [entries, setEntries] = useState<StoredLcqSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, tournament: "lcq", ...body }),
      });
      if (res.status === 401) {
        onAuthFailure();
        throw new Error("unauthorized");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    },
    [password, onAuthFailure]
  );

  const load = useCallback(async () => {
    try {
      const data = await call({ action: "entries" });
      setEntries(data.submissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load entries");
    }
  }, [call]);

  useEffect(() => {
    // setState happens after the fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = async (id: string) => {
    setConfirming(null);
    try {
      await call({ action: "delete-entry", id });
      if (viewing === id) setViewing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const togglePaid = async (entry: StoredLcqSubmission) => {
    try {
      await call({ action: "set-paid", id: entry.id, paid: !entry.paid });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update paid status");
    }
  };

  const hasResults =
    Object.keys(engine.predictableOnly(LCQ_DEF, results)).length > 0;
  const viewingEntry = entries?.find((e) => e.id === viewing);

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-zinc-200">
        LCQ Entries{entries ? ` (${entries.length})` : ""}
      </h2>
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      {entries === null ? (
        <p className="animate-pulse text-sm text-zinc-500">Loading entries…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No brackets submitted yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center gap-2 border-b border-zinc-800/70 px-3 py-2 text-sm last:border-b-0 odd:bg-zinc-900/40"
            >
              <span className="font-medium text-zinc-200">{entry.name}</span>
              <span className="text-xs text-zinc-600">
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {hasResults &&
                  ` · ${engine.scoreSubmission(LCQ_DEF, entry.picks, results)} pts`}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => togglePaid(entry)}
                  title={
                    entry.paid
                      ? "Marked paid — click to unmark"
                      : "Mark this player's buy-in as received"
                  }
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    entry.paid
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {entry.paid ? "💰 Paid" : "Mark paid"}
                </button>
                <button
                  onClick={() =>
                    setViewing(viewing === entry.id ? null : entry.id)
                  }
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  {viewing === entry.id ? "Hide" : "View"}
                </button>
                {confirming === entry.id ? (
                  <>
                    <button
                      onClick={() => remove(entry.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                    >
                      Confirm delete
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(entry.id)}
                    className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-900/60"
                  >
                    Delete
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {viewingEntry && (
        <div className="mt-4">
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {viewingEntry.name}&rsquo;s bracket
          </h3>
          <LcqBracketView
            decided={engine.pruneDecided(LCQ_DEF, viewingEntry.picks)}
            compare={
              hasResults ? engine.pruneDecided(LCQ_DEF, results) : undefined
            }
          />
        </div>
      )}
    </section>
  );
}
