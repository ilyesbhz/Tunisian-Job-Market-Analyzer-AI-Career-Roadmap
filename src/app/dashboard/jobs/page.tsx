import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getJobs, getFilterOptions, parseFilters } from "@/lib/jobs";
import { getRates, toMonthlyTnd } from "@/lib/currency";
import { LOCAL_COUNTRY } from "@/lib/config";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getCurrentUser();
  const filters = parseFilters(await searchParams);
    if (!filters.country) filters.country = LOCAL_COUNTRY;
  const rates = await getRates();
  const [{ jobs, total, pages }, options] = await Promise.all([
    getJobs(filters),
    getFilterOptions(),
  ]);

  const pageLink = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && k !== "page") sp.set(k, String(v));
    }
    sp.set("page", String(p));
    return `/dashboard/jobs?${sp}`;
  };

  const input = "rounded border p-2 text-sm";

  return (
    <main className="mx-auto mt-12 max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job offers ({total})</h1>
        <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3">
        <input name="q" defaultValue={filters.q} placeholder="Title or company" className={input} />
        <select name="country" defaultValue={filters.country} className={input}>
          {options.countries.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="all">All countries</option>
        </select>
        <input name="city" defaultValue={filters.city} placeholder="City" className={input} />
        <select name="sector" defaultValue={filters.sector ?? ""} className={input}>
          <option value="">All sectors</option>
          {options.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input name="skill" defaultValue={filters.skill} placeholder="Skill (exact)" className={input} />
        <button className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">Filter</button>
        <Link href="/dashboard/jobs" className="self-center text-sm underline">Reset</Link>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Title</th>
              <th className="p-2">Company</th>
              <th className="p-2">Location</th>
              <th className="p-2">Sector</th>
              <th className="p-2">Salary</th>
              <th className="p-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b align-top">
                <td className="p-2 font-medium">{j.title}</td>
                <td className="p-2">{j.company ?? "-"}</td>
                <td className="p-2">{[j.city, j.country].filter(Boolean).join(", ")}</td>
                <td className="p-2">{j.sector ?? "-"}</td>
                 <td className="p-2">
                    {(() => {
                    const isTnd = j.currency === "TND";
                    const lo = j.salaryMin != null
                      ? isTnd
                        ? (j.salaryPeriod === "YEAR" ? Math.round(j.salaryMin / 12) : j.salaryMin)
                        : toMonthlyTnd(j.salaryMin, j.currency, j.salaryPeriod, rates.perTnd)
                      : null;
                    const hi = j.salaryMax != null
                      ? isTnd
                        ? (j.salaryPeriod === "YEAR" ? Math.round(j.salaryMax / 12) : j.salaryMax)
                        : toMonthlyTnd(j.salaryMax, j.currency, j.salaryPeriod, rates.perTnd)
                      : null;
                    if (lo == null || hi == null) return "-";
                    return (
                      <>
                        ≈ {lo} - {hi} TND / month
                        {!isTnd && (
                          <>
                            <br />
                            <span className="text-xs opacity-60">
                              {j.salaryMin} - {j.salaryMax} {j.currency} / {j.salaryPeriod === "YEAR" ? "year" : "month"}
                            </span>
                          </>
                        )}
                      </>
                    );
                  })()}
                </td>
                <td className="p-2">{j.source.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <p className="mt-6 text-sm">No offers match these filters.</p>}
      </div>

      <div className="mt-6 flex items-center gap-4 text-sm">
        {filters.page > 1 && <Link href={pageLink(filters.page - 1)} className="underline">Previous</Link>}
        <span>Page {filters.page} of {pages}</span>
        {filters.page < pages && <Link href={pageLink(filters.page + 1)} className="underline">Next</Link>}
      </div>
            <p className="mt-6 text-xs opacity-60">
        <a href="https://www.exchangerate-api.com" className="underline">Rates By Exchange Rate API</a>
      </p>
    </main>
  );
}