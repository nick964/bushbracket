"use client";

import { useCallback, useEffect, useState } from "react";
import BracketView from "@/components/BracketView";
import type { GameId, TeamId } from "@/lib/bracket";
import {
  predictableOnly,
  pruneDecided,
  scoreSubmission,
  type Decided,
  type Submission,
} from "@/lib/logic";

const PW_KEY = "bushbracket-admin-pw";

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    // sessionStorage is only readable client-side — one-time hydration read
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassword(sessionStorage.getItem(PW_KEY));
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-zinc-100">
          <span className="text-orange-500">Admin</span> · Results
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Click the actual winner as each game finishes. Entering the first
          result locks everyone&rsquo;s picks.
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
        <ResultsEditor
          password={password}
          onAuthFailure={() => {
            sessionStorage.removeItem(PW_KEY);
            setPassword(null);
          }}
        />
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results);
      setManualLock(Boolean(data.manualLock));
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
          {resultCount > 0
            ? `${resultCount}/10 results entered — picks locked`
            : manualLock
              ? "Submissions locked by admin — no results yet"
              : "No results yet — picks still open"}
        </span>
        {resultCount === 0 && (
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
  const [entries, setEntries] = useState<Submission[] | null>(null);
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

  const remove = async (name: string) => {
    setConfirming(null);
    try {
      await call({ action: "delete-entry", name });
      if (viewing === name) setViewing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const hasResults = Object.keys(predictableOnly(results)).length > 0;
  const viewingEntry = entries?.find((e) => e.name === viewing);

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
              key={entry.name}
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
                  onClick={() =>
                    setViewing(viewing === entry.name ? null : entry.name)
                  }
                  className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  {viewing === entry.name ? "Hide" : "View"}
                </button>
                {confirming === entry.name ? (
                  <>
                    <button
                      onClick={() => remove(entry.name)}
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
                    onClick={() => setConfirming(entry.name)}
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
