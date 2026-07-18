import { getStore } from "@/lib/store";
import {
  isCompleteBracket,
  normalizeName,
  predictableOnly,
  pruneDecided,
  type Decided,
} from "@/lib/logic";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { name?: unknown; picks?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 30) {
    return Response.json(
      { error: "Enter a name between 1 and 30 characters" },
      { status: 400 }
    );
  }
  const id = normalizeName(name);
  if (!id) {
    return Response.json(
      { error: "Name must contain letters or numbers" },
      { status: 400 }
    );
  }

  const picks = predictableOnly((body.picks ?? {}) as Decided);
  if (!isCompleteBracket(picks)) {
    return Response.json(
      { error: "Bracket is incomplete or inconsistent — pick every game" },
      { status: 400 }
    );
  }
  // Store the validated, consistent set of picks only
  const cleanPicks = predictableOnly(pruneDecided(picks));

  const store = getStore();

  const results = predictableOnly(await store.getResults());
  if (Object.keys(results).length > 0) {
    return Response.json(
      { error: "Picks are locked — the tournament has started" },
      { status: 403 }
    );
  }

  const created = await store.addSubmission(id, {
    name,
    picks: cleanPicks,
    createdAt: Date.now(),
  });
  if (!created) {
    return Response.json(
      { error: `A bracket was already submitted under "${name}"` },
      { status: 409 }
    );
  }

  return Response.json({ ok: true, name, picks: cleanPicks });
}
