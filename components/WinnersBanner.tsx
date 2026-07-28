import {
  computeLeaderboard,
  type Decided,
  type Submission,
} from "@/lib/logic";
import { BASE_POT, VENMO_HANDLE } from "@/lib/pot";

// Final payout announcement, shown once the admin marks the tournament
// complete. Overall top score wins the base pot; the buy-ins go to the top
// score among paid players (the same person takes everything if they paid).
export default function WinnersBanner({
  pot,
  submissions,
  results,
}: {
  pot: number;
  submissions: Submission[];
  results: Decided;
}) {
  const rows = computeLeaderboard(submissions, results);
  if (rows.length === 0) return null;

  const champs = rows.filter((r) => r.rank === 1);
  const paidRows = rows.filter((r) => r.paid);
  const topPaid =
    paidRows.length > 0
      ? paidRows.filter((r) => r.score === paidRows[0].score)
      : [];
  const buyIns = Math.max(pot - BASE_POT, 0);

  const names = (list: typeof rows) => list.map((r) => r.name).join(" & ");
  const takes = (list: typeof rows, amount: number) =>
    `${list.length > 1 ? "split" : list === champs ? "wins" : "takes"} the $${amount}`;

  // A paid champion is also the top paid player, so they sweep the whole pot.
  const sweep = champs.every((c) => c.paid);

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
          {pot} paid pot!
        </p>
      ) : (
        <div className="mt-1 space-y-1">
          <p className="font-display text-2xl font-bold uppercase tracking-tight text-amber-300">
            🏆 Champion: {names(champs)}
          </p>
          <p className="text-sm text-amber-200/80">
            {names(champs)} {takes(champs, BASE_POT)} free pot.
          </p>
          {topPaid.length > 0 && buyIns > 0 && (
            <p className="text-sm text-amber-200/80">
              💰 Top paid player{topPaid.length > 1 ? "s" : ""}:{" "}
              <span className="font-semibold text-amber-300">
                {names(topPaid)}
              </span>{" "}
              {takes(topPaid, buyIns)} in buy-ins.
            </p>
          )}
        </div>
      )}
      <p className="label-caps mt-3 text-amber-200/50">
        Payouts via Venmo @{VENMO_HANDLE} · Thanks for playing
      </p>
    </div>
  );
}
