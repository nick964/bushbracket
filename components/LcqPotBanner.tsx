import { BUY_IN, VENMO_HANDLE } from "@/lib/pot";

// LCQ prize pot + payout rules, shown at the top of the /lcq page. Unlike the
// main event there's no organizer seed money: the pot starts at $0 and is
// purely buy-ins, so there's a single pot card instead of paid/free ones.
export default function LcqPotBanner({ pot }: { pot: number }) {
  // Segmented HUD bar: one block lights up per buy-in received
  const buyIns = Math.max(0, Math.round(pot / BUY_IN));
  const SEGMENTS = 8;

  return (
    <div className="mb-6">
      <div className="relative flex flex-col items-center justify-center border border-orange-500 bg-[#1e2020] p-4">
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-tr" />
        <span className="label-caps absolute top-1 right-1 text-white/20">
          COORD_LCQ
        </span>
        <span className="label-caps mb-1 text-orange-500">
          Buy-In Pot · Paid Players Only
        </span>
        <span className="font-display text-3xl font-bold text-orange-500">
          ${pot}
        </span>
        <div className="mt-2 flex h-1 w-full gap-0.5">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={`h-full flex-1 bg-orange-500 ${
                i < Math.min(buyIns, SEGMENTS) ? "" : "opacity-30"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 border border-white/10 bg-black/40 px-4 py-3">
        <p className="text-sm font-bold uppercase tracking-widest text-zinc-200">
          Rules of Engagement · ${BUY_IN} buy-in · Venmo{" "}
          <a
            href={`https://venmo.com/u/${VENMO_HANDLE}`}
            target="_blank"
            rel="noreferrer"
            className="text-orange-400 underline hover:text-orange-300"
          >
            @{VENMO_HANDLE}
          </a>
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-300">
          <li>
            Entering is free — everyone plays for bragging rights on the
            leaderboard.
          </li>
          <li>
            Want money on it? Throw in ${BUY_IN} and you&rsquo;re in the pot.
            Nobody&rsquo;s seeding this one, so it starts at $0 and is buy-ins
            all the way — it grows as players join.
          </li>
          <li>
            The top score among paid players takes the whole pot, even if a
            free player tops the board.
          </li>
        </ul>
      </div>
    </div>
  );
}
