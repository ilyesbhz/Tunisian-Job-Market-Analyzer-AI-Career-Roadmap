import { cn } from "cn";

import { LOCAL_COUNTRY } from "@/lib/config";
import type { PppFactors } from "@/lib/ppp";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const range = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

/**
 * Compares a foreign monthly salary (in its own currency) with Tunisia:
 * at the exchange rate, in Tunisian buying power (PPP), and against the Tunisian average.
 */
export function SalaryComparison({
  monthlyMin,
  monthlyMax = monthlyMin,
  currency,
  country,
  perTnd,
  ppp,
  localAvg,
  compact = false,
}: {
  monthlyMin: number;
  monthlyMax?: number;
  currency: string;
  country: string;
  perTnd: Record<string, number>;
  ppp: PppFactors;
  localAvg: number | null;
  compact?: boolean;
}) {
  const rate = perTnd[currency];
  if (!rate) return <p className="text-muted-foreground text-sm">No exchange rate for {currency}.</p>;

  const mid = (monthlyMin + monthlyMax) / 2;
  const toTnd = (v: number) => v / rate;

  // local currency -> international $ (PPP) -> TND (PPP)
  const pppForeign = ppp.factors[country];
  const pppLocal = ppp.factors[LOCAL_COUNTRY];
  const toBuyingPower = pppForeign && pppLocal ? (v: number) => (v / pppForeign) * pppLocal : null;

  const vsAvg = (v: number) => (localAvg ? `${(v / localAvg).toFixed(1)}× the ${LOCAL_COUNTRY} average` : undefined);

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-3", !compact && "sm:grid-cols-3")}>
        <Stat
          label="At the exchange rate"
          value={`${range(toTnd(monthlyMin), toTnd(monthlyMax))} TND / month`}
          hint={vsAvg(toTnd(mid))}
        />
        <Stat
          label={`In ${LOCAL_COUNTRY} buying power`}
          value={
            toBuyingPower
              ? `${range(toBuyingPower(monthlyMin), toBuyingPower(monthlyMax))} TND / month`
              : "Not available"
          }
          hint={toBuyingPower ? vsAvg(toBuyingPower(mid)) : `No cost-of-living data for ${country}`}
        />
        <Stat
          label={`${LOCAL_COUNTRY} average`}
          value={localAvg ? `${fmt(localAvg)} TND / month` : "-"}
          hint="From imported job offers"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Buying power adjusts for the cost of living using the World Bank PPP factor for household consumption
        {ppp.year ? ` (${ppp.year})` : ""}: it shows what this salary would be worth if it bought the same things in{" "}
        {LOCAL_COUNTRY}. Foreign salaries are usually quoted gross (before tax), while {LOCAL_COUNTRY} offers are
        usually net.
      </p>
    </div>
  );
}
