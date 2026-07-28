import { auth } from "@clerk/nextjs/server";
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
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { error: "Sign in to submit a bracket" },
      { status: 401 }
    );
  }

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
  const nameKey = normalizeName(name);
  if (!nameKey) {
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

  const [results, manualLock, submissions] = await Promise.all([
    store.getResults(),
    store.getManualLock(),
    store.getSubmissions(),
  ]);
  if (manualLock || Object.keys(predictableOnly(results)).length > 0) {
    return Response.json(
      { error: "Picks are locked — submissions have closed" },
      { status: 403 }
    );
  }

  // Display names must stay unique — the leaderboard identifies players by name
  const nameTaken = submissions.some(
    (s) => s.id !== userId && normalizeName(s.name) === nameKey
  );
  if (nameTaken) {
    return Response.json(
      { error: `A bracket was already submitted under "${name}"` },
      { status: 409 }
    );
  }

  // One bracket per account — the submission is keyed by the Clerk user id
  const created = await store.addSubmission(userId, {
    name,
    picks: cleanPicks,
    createdAt: Date.now(),
  });
  if (!created) {
    return Response.json(
      { error: "You've already submitted a bracket" },
      { status: 409 }
    );
  }

  return Response.json({ ok: true, name, picks: cleanPicks });
}
