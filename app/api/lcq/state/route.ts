import { auth } from "@clerk/nextjs/server";
import { getStore } from "@/lib/store";
import { predictableOnly } from "@/lib/engine";
import { LCQ_DEF } from "@/lib/lcq";

export const dynamic = "force-dynamic";

// Public LCQ state, mirroring /api/state: actual results, lock status, and
// submissions. Before the bracket locks only names are exposed (so nobody can
// copy picks); once the first real result is in, full picks are returned for
// the leaderboard view. Signed-in callers also get their own submission back
// as `yours`.
export async function GET() {
  const { userId } = await auth();
  const store = getStore();
  const lcq = store.lcq;
  // potsHidden is a single site-wide flag stored with the main event
  const [results, submissions, manualLock, pot, buyIn, potsHidden, completed] =
    await Promise.all([
      lcq.getResults(),
      lcq.getSubmissions(),
      lcq.getManualLock(),
      lcq.getPot(),
      lcq.getBuyIn(),
      store.getPotsHidden(),
      lcq.getCompleted(),
    ]);

  const publicResults = predictableOnly(LCQ_DEF, results);
  const locked =
    manualLock || completed || Object.keys(publicResults).length > 0;

  // Clerk user ids are the storage keys — keep them out of the public payload
  const mine = userId ? submissions.find((s) => s.id === userId) : undefined;
  const publicSubs = submissions.map((s) => ({
    name: s.name,
    picks: s.picks,
    createdAt: s.createdAt,
    paid: Boolean(s.paid),
  }));

  return Response.json({
    locked,
    manualLock,
    completed,
    pot,
    buyIn,
    potsHidden,
    results: publicResults,
    yours: mine
      ? { name: mine.name, picks: mine.picks, createdAt: mine.createdAt }
      : null,
    submissions: locked
      ? publicSubs
      : publicSubs.map((s) => ({ name: s.name, paid: s.paid })),
  });
}
