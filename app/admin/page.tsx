"use client";

import { useCallback, useEffect, useState } from "react";
import BracketView from "@/components/BracketView";
import type { GameId, TeamId } from "@/lib/bracket";
import { predictableOnly, pruneDecided, type Decided } from "@/lib/logic";

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results);
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
      setResults(data.results);
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
          {resultCount === 0
            ? "No results yet — picks still open"
            : `${resultCount}/10 results entered — picks locked`}
        </span>
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
    </div>
  );
}
