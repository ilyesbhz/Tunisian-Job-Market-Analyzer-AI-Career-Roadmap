import { COUNTRY_INFO } from "@/lib/config";

// World Bank PPP conversion factor for household consumption (local currency per international $).
// Used to compare what a salary actually buys in each country, not just its exchange-rate value.
const INDICATOR = "PA.NUS.PRVT.PP";

export type PppFactors = {
  // keyed by country name as stored in JobOffer.country
  factors: Record<string, number>;
  year: string | null;
};

export async function getPppFactors(): Promise<PppFactors> {
  const byIso = new Map(Object.entries(COUNTRY_INFO).map(([name, info]) => [info.iso3, name]));
  const codes = [...byIso.keys()].join(";");

  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${codes}/indicator/${INDICATOR}?format=json&mrnev=1&per_page=100`,
      { next: { revalidate: 60 * 60 * 24 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return { factors: {}, year: null };
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
    return { factors, year };
  } catch {
    return { factors: {}, year: null }; // the comparison simply hides the buying-power figure
  }
}
