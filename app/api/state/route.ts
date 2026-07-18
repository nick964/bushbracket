import { getStore } from "@/lib/store";
import { predictableOnly } from "@/lib/logic";

export const dynamic = "force-dynamic";

// Public state: actual results, lock status, and submissions. Before the
// bracket locks only names are exposed (so nobody can copy picks); once the
// first real result is in, full picks are returned for the leaderboard view.
export async function GET() {
  const store = getStore();
  const [results, submissions, manualLock] = await Promise.all([
    store.getResults(),
    store.getSubmissions(),
    store.getManualLock(),
  ]);

  const publicResults = predictableOnly(results);
  const locked = manualLock || Object.keys(publicResults).length > 0;

  return Response.json({
    locked,
    manualLock,
    results: publicResults,
    submissions: locked
      ? submissions
      : submissions.map((s) => ({ name: s.name })),
  });
}
