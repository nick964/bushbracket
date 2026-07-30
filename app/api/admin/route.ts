import { PREDICTABLE_GAMES, type GameId, type TeamId } from "@/lib/bracket";
import {
  predictableOnly,
  pruneDecided,
  resolveParticipants,
} from "@/lib/logic";
import * as engine from "@/lib/engine";
import { LCQ_DEF, LCQ_ORDER, type LcqGameId, type LcqTeamId } from "@/lib/lcq";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

interface AdminBody {
  password?: string;
  /** Which tournament to operate on; defaults to the main EWC bracket. */
  tournament?: "ewc" | "lcq";
  action?:
    | "login"
    | "set"
    | "clear"
    | "entries"
    | "delete-entry"
    | "lock"
    | "unlock"
    | "set-pot"
    | "set-paid"
    | "complete"
    | "uncomplete";
  gameId?: string;
  winner?: string;
  /** Submission id (Clerk user id) for delete-entry and set-paid. */
  id?: string;
  /** New pot total in dollars for set-pot. */
  amount?: number;
  /** Buy-in status for set-paid. */
  paid?: boolean;
}

// LCQ admin actions — same shape as the main event minus pot/paid handling.
async function handleLcq(body: AdminBody): Promise<Response> {
  const lcq = getStore().lcq;

  if (body.action === "entries") {
    const submissions = await lcq.getSubmissions();
    submissions.sort((a, b) => a.createdAt - b.createdAt);
    return Response.json({ ok: true, submissions });
  }

  if (body.action === "lock" || body.action === "unlock") {
    const manualLock = body.action === "lock";
    await lcq.setManualLock(manualLock);
    return Response.json({ ok: true, manualLock });
  }

  if (body.action === "complete" || body.action === "uncomplete") {
    const completed = body.action === "complete";
    await lcq.setCompleted(completed);
    return Response.json({ ok: true, completed });
  }

  if (body.action === "set-paid") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return Response.json({ error: "Unknown entry" }, { status: 400 });
    }
    await lcq.setPaid(id, Boolean(body.paid));
    return Response.json({ ok: true });
  }

  if (body.action === "set-pot") {
    const amount = body.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return Response.json(
        { error: "Pot must be a non-negative dollar amount" },
        { status: 400 }
      );
    }
    const pot = Math.round(amount);
    await lcq.setPot(pot);
    return Response.json({ ok: true, pot });
  }

  if (body.action === "delete-entry") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return Response.json({ error: "Unknown entry" }, { status: 400 });
    }
    await lcq.deleteSubmission(id);
    return Response.json({ ok: true });
  }

  const gameId = body.gameId as LcqGameId | undefined;
  if (!gameId || !LCQ_ORDER.includes(gameId)) {
    return Response.json({ error: "Unknown game" }, { status: 400 });
  }

  const results = engine.pruneDecided(LCQ_DEF, await lcq.getResults());

  if (body.action === "set") {
    const winner = body.winner as LcqTeamId | undefined;
    const [a, b] = engine.resolveParticipants(LCQ_DEF, results)[gameId];
    if (a === null || b === null) {
      return Response.json(
        { error: "Both participants of this game aren't decided yet" },
        { status: 400 }
      );
    }
    if (winner !== a && winner !== b) {
      return Response.json(
        { error: `${winner} is not playing in ${gameId}` },
        { status: 400 }
      );
    }
    results[gameId] = winner;
  } else if (body.action === "clear") {
    delete results[gameId];
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  // Re-prune so clearing/changing a game wipes any downstream results that
  // depended on it.
  const clean = engine.predictableOnly(
    LCQ_DEF,
    engine.pruneDecided(LCQ_DEF, results)
  );
  await lcq.setResults(clean);

  return Response.json({ ok: true, results: clean });
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured on the server" },
      { status: 500 }
    );
  }

  let body: AdminBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.password !== expected) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  if (body.action === "login") {
    return Response.json({ ok: true });
  }

  if (body.tournament === "lcq") {
    return handleLcq(body);
  }

  // Full submissions (including picks) regardless of lock state — admin only
  if (body.action === "entries") {
    const submissions = await getStore().getSubmissions();
    submissions.sort((a, b) => a.createdAt - b.createdAt);
    return Response.json({ ok: true, submissions });
  }

  if (body.action === "lock" || body.action === "unlock") {
    const manualLock = body.action === "lock";
    await getStore().setManualLock(manualLock);
    return Response.json({ ok: true, manualLock });
  }

  if (body.action === "complete" || body.action === "uncomplete") {
    const completed = body.action === "complete";
    await getStore().setCompleted(completed);
    return Response.json({ ok: true, completed });
  }

  if (body.action === "set-paid") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return Response.json({ error: "Unknown entry" }, { status: 400 });
    }
    await getStore().setPaid(id, Boolean(body.paid));
    return Response.json({ ok: true });
  }

  if (body.action === "set-pot") {
    const amount = body.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return Response.json(
        { error: "Pot must be a non-negative dollar amount" },
        { status: 400 }
      );
    }
    const pot = Math.round(amount);
    await getStore().setPot(pot);
    return Response.json({ ok: true, pot });
  }

  if (body.action === "delete-entry") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return Response.json({ error: "Unknown entry" }, { status: 400 });
    }
    await getStore().deleteSubmission(id);
    return Response.json({ ok: true });
  }

  const gameId = body.gameId as GameId | undefined;
  if (!gameId || !PREDICTABLE_GAMES.includes(gameId)) {
    return Response.json({ error: "Unknown game" }, { status: 400 });
  }

  const store = getStore();
  const results = pruneDecided(await store.getResults());

  if (body.action === "set") {
    const winner = body.winner as TeamId | undefined;
    const [a, b] = resolveParticipants(results)[gameId];
    if (a === null || b === null) {
      return Response.json(
        { error: "Both participants of this game aren't decided yet" },
        { status: 400 }
      );
    }
    if (winner !== a && winner !== b) {
      return Response.json(
        { error: `${winner} is not playing in ${gameId}` },
        { status: 400 }
      );
    }
    results[gameId] = winner;
  } else if (body.action === "clear") {
    delete results[gameId];
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  // Re-prune so clearing/changing a game wipes any downstream results that
  // depended on it (e.g. undoing a winners' match clears the decider its
  // loser dropped into and any playoff games downstream).
  const clean = predictableOnly(pruneDecided(results));
  await store.setResults(clean);

  return Response.json({ ok: true, results: clean });
}
