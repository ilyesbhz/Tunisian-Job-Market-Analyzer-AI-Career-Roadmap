import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

// Market analytics written by the tn-jobs pipeline (exports analytics/*.json into data/analytics).
const DIR = path.join(process.cwd(), "data", "analytics");

export const TREND_COUNTRIES = {
  tn: { name: "Tunisia", currency: "TND" },
  fr: { name: "France", currency: "EUR" },
  gb: { name: "United Kingdom", currency: "GBP" },
} as const;
export type TrendCountry = keyof typeof TREND_COUNTRIES;

const SENIORITY_ORDER = ["intern", "junior", "mid", "senior"] as const;
const SENIORITY_LABELS: Record<string, string> = { intern: "Internship", junior: "Junior", mid: "Mid-level", senior: "Senior" };

type Overview = {
  country: string; jobs: number; active_jobs: number; companies: number; first_posting: string; last_posting: string;
  jobs_with_salary: number; pct_with_salary: number; median_salary_per_year: number | null; currency: string;
};
type Daily = { country: string; day: string; new_jobs: number };
type Tool = { country: string; sector: string; tool: string; jobs: number };
type Sector = {
  country: string; sector: string; active_jobs: number; jobs_with_salary: number;
  median_salary_per_year: number | null; avg_pay_percentile: number | null;
};
type Seniority = { country: string; seniority: string; jobs_with_salary: number; median_salary_per_year: number | null };
type PayBySector = { sector: string } & Partial<Record<TrendCountry, number | null>>;
type Meta = { generated_at: string; caveats: string[] };

async function read<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, file), "utf-8")) as T;
  } catch {
    return null; // a missing file only hides its section
  }
}

const DAY_MS = 86_400_000;
const perMonth = (yearly: number | null) => (yearly == null ? null : Math.round(yearly / 12));

export async function getTrends(country: TrendCountry) {
  const [overview, daily, tools, sectors, seniority, payBySector, meta] = await Promise.all([
    read<Overview[]>("market_overview.json"),
    read<Daily[]>("daily_trend.json"),
    read<Tool[]>("tool_demand.json"),
    read<Sector[]>("sector_summary.json"),
    read<Seniority[]>("salary_by_seniority.json"),
    read<PayBySector[]>("pay_percentile_by_sector.json"),
    read<Meta>("meta.json"),
  ]);

  const ov = overview?.find((o) => o.country === country) ?? null;

  // New offers per calendar day; days without data stay null (not zero) so gaps aren't read as "no hiring"
  const days = (daily ?? []).filter((d) => d.country === country).sort((a, b) => a.day.localeCompare(b.day));
  const byDay = new Map(days.map((d) => [d.day, d.new_jobs]));
  const series: { day: string; newJobs: number | null; avg7: number | null }[] = [];
  if (days.length) {
    const start = Date.parse(days[0].day);
    const end = Date.parse(days[days.length - 1].day);
    for (let t = start; t <= end; t += DAY_MS) {
      const day = new Date(t).toISOString().slice(0, 10);
      // 7-day trailing average over the days that have data
      const window = Array.from({ length: 7 }, (_, i) => byDay.get(new Date(t - i * DAY_MS).toISOString().slice(0, 10)))
        .filter((v): v is number => v != null);
      series.push({
        day,
        newJobs: byDay.get(day) ?? null,
        avg7: window.length >= 4 ? Math.round(window.reduce((a, b) => a + b, 0) / window.length) : null,
      });
    }
  }
  const recent = series.slice(-7).map((s) => s.newJobs).filter((v): v is number => v != null);
  const previous = series.slice(-14, -7).map((s) => s.newJobs).filter((v): v is number => v != null);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  // Tools: postings naming each tool, summed over sectors (each posting has one sector)
  const toolTotals = new Map<string, number>();
  for (const t of tools ?? []) if (t.country === country) toolTotals.set(t.tool, (toolTotals.get(t.tool) ?? 0) + t.jobs);
  const topTools = [...toolTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value]) => ({ name, value, share: ov?.jobs ? Math.round((value / ov.jobs) * 1000) / 10 : null }));

  const sectorRows = (sectors ?? [])
    .filter((s) => s.country === country)
    .map((s) => ({
      sector: s.sector,
      activeJobs: s.active_jobs,
      withSalary: s.jobs_with_salary,
      medianMonthly: perMonth(s.median_salary_per_year),
      payPercentile: s.avg_pay_percentile,
    }))
    .sort((a, b) => b.activeJobs - a.activeJobs);

  const seniorityRows = SENIORITY_ORDER.flatMap((key) => {
    const r = seniority?.find((s) => s.country === country && s.seniority === key);
    return r && r.median_salary_per_year != null
      ? [{ name: SENIORITY_LABELS[key], value: perMonth(r.median_salary_per_year) as number, n: r.jobs_with_salary }]
      : [];
  });

  return {
    country,
    currency: TREND_COUNTRIES[country].currency,
    generatedAt: meta?.generated_at ?? null,
    caveats: meta?.caveats ?? [],
    overview: ov && {
      activeJobs: ov.active_jobs,
      companies: ov.companies,
      pctWithSalary: ov.pct_with_salary,
      medianMonthly: perMonth(ov.median_salary_per_year),
      firstPosting: ov.first_posting,
      lastPosting: ov.last_posting,
    },
    daily: series,
    // Compare daily averages, not totals, so a week with missing days isn't read as a drop
    lastWeek: recent.length
      ? {
          perDay: Math.round(sum(recent) / recent.length),
          change: previous.length
            ? Math.round((sum(recent) / recent.length / (sum(previous) / previous.length) - 1) * 100)
            : null,
        }
      : null,
    topTools,
    sectors: sectorRows,
    seniority: seniorityRows,
    payBySector: (payBySector ?? []).filter((r) => r.tn != null || r.fr != null || r.gb != null),
  };
}

export type Trends = Awaited<ReturnType<typeof getTrends>>;
