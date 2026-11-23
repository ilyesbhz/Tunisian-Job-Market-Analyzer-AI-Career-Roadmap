import { COUNTRY_INFO } from "@/lib/config";

// World Bank PPP conversion factor for household consumption (local currency per international $).
// Used to compare what a salary actually buys in each country, not just its exchange-rate value.
const INDICATOR = "PA.NUS.PRVT.PP";
const RETRY_AFTER_FAILURE_MS = 10 * 60 * 1000;

export type PppFactors = {
  // keyed by country name as stored in JobOffer.country
  factors: Record<string, number>;
  year: string | null;
};

const EMPTY: PppFactors = { factors: {}, year: null };

// The World Bank API can be slow or unreachable. Pages must not wait on it every time:
// keep the last good answer, and after a failure don't call it again for a while.
let lastGood: PppFactors | null = null;
let lastFailureAt = 0;

export async function getPppFactors(): Promise<PppFactors> {
  if (Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return lastGood ?? EMPTY;

  const byIso = new Map(Object.entries(COUNTRY_INFO).map(([name, info]) => [info.iso3, name]));
  const codes = [...byIso.keys()].join(";");

  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${codes}/indicator/${INDICATOR}?format=json&mrnev=1&per_page=100`,
      { next: { revalidate: 60 * 60 * 24 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`World Bank API returned ${res.status}`);
    const data = await res.json();
    const rows: Array<{ countryiso3code: string; date: string; value: number | null }> = Array.isArray(data?.[1])
      ? data[1]
      : [];

    const factors: Record<string, number> = {};
    let year: string | null = null;
    for (const r of rows) {
      const name = byIso.get(r.countryiso3code);
      if (!name || typeof r.value !== "number" || r.value <= 0) continue;
      factors[name] = r.value;
      if (!year || r.date < year) year = r.date; // report the oldest year used
    }
    if (Object.keys(factors).length === 0) throw new Error("World Bank API returned no factors");
    lastGood = { factors, year };
    return lastGood;
  } catch {
    lastFailureAt = Date.now();
    return lastGood ?? EMPTY; // without data the comparison simply hides the buying-power figure
  }
}
