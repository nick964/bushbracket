import { BASE_POT, BUY_IN, VENMO_HANDLE } from "@/lib/pot";

// Prize pot dashboard + payout rules, shown at the top of the public pages.
// Two pots so free players know exactly what they're playing for: the paid
// pot is the full total (base + buy-ins), the free pot is the fixed base.
export default function PotBanner({ pot }: { pot: number }) {
  // Segmented HUD bar: one block lights up per buy-in received
  const buyIns = Math.max(0, Math.round((pot - BASE_POT) / BUY_IN));
  const SEGMENTS = 8;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="relative flex flex-col items-center justify-center border border-orange-500 bg-[#1e2020] p-4">
          <span className="hud-corner hud-corner-tl" />
          <span className="hud-corner hud-corner-tr" />
          <span className="label-caps absolute top-1 right-1 text-white/20">
            COORD_01_A
          </span>
          <span className="label-caps mb-1 text-orange-500">
            Paid Players Pot
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
        <div className="relative flex flex-col items-center justify-center border border-white/15 bg-[#1e2020] p-4">
          <span className="label-caps absolute top-1 right-1 text-white/10">
            COORD_01_B
          </span>
          <span className="label-caps mb-1 text-zinc-400">
            Free Players Pot
          </span>
          <span className="font-display text-3xl font-bold text-zinc-300">
            ${BASE_POT}
          </span>
          <div className="mt-2 flex h-1 w-full gap-0.5">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className="h-full flex-1 bg-zinc-500/60" />
            ))}
          </div>
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
            Everyone plays for the ${BASE_POT} free pot — the top score overall
            wins it, paid or not.
          </li>
          <li>
            Throw in ${BUY_IN} and you&rsquo;re playing for the paid pot
            instead: the ${BASE_POT} plus every buy-in. It grows as players
            join.
          </li>
          <li>
            Buy-ins only ever go to paid players — the top score among them
            takes that money even if a free player tops the board.
          </li>
        </ul>
      </div>
    </div>
  );
}
