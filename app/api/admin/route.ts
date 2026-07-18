import { PREDICTABLE_GAMES, type GameId, type TeamId } from "@/lib/bracket";
import {
  predictableOnly,
  pruneDecided,
  resolveParticipants,
} from "@/lib/logic";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

interface AdminBody {
  password?: string;
  action?: "login" | "set" | "clear";
  gameId?: string;
  winner?: string;
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
  // depended on it (e.g. undoing a UBSF result clears UBF and the LBQF the
  // loser dropped into).
  const clean = predictableOnly(pruneDecided(results));
  await store.setResults(clean);

  return Response.json({ ok: true, results: clean });
}
