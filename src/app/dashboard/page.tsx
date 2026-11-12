import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getFilterOptions } from "@/lib/jobs";
import { getStats, getAvgSalaryTnd, getSalaryByCountry } from "@/lib/stats";
import { getRates } from "@/lib/currency";
import { LOCAL_COUNTRY } from "@/lib/config";
import { HBarChart } from "@/components/charts";
import { SalaryConverter } from "@/components/salary-converter";
import { logout } from "@/app/(auth)/actions";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-60">{hint}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const options = await getFilterOptions();
  const rates = await getRates();

  const raw = Array.isArray(sp.country) ? sp.country[0] : sp.country;
  const compareAll = raw === "all";
  const country = compareAll
    ? undefined
    : raw && options.countries.includes(raw)
      ? raw
      : LOCAL_COUNTRY;

  const [stats, localSalary, salaryByCountry] = await Promise.all([
    getStats(country),
    country && country !== LOCAL_COUNTRY ? getAvgSalaryTnd(LOCAL_COUNTRY) : Promise.resolve(null),
    compareAll ? getSalaryByCountry() : Promise.resolve([]),
  ]);

  const diff =
    stats.salary && localSalary
      ? Math.round((stats.salary.avg / localSalary.avg - 1) * 100)
      : null;
  const salaryHint = stats.salary
    ? `${stats.salary.n} offers, converted to TND${diff !== null ? ` · ${diff >= 0 ? "+" : ""}${diff}% vs ${LOCAL_COUNTRY}` : ""}`
    : "no salary data";

  return (
    <main className="mx-auto mt-12 max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm opacity-70">Signed in as {user.name} ({user.email})</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs" className="text-sm underline">Browse job offers</Link>
          <form action={logout}>
            <button className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">Log out</button>
          </form>
        </div>
      </div>

      <form className="mt-6 flex items-center gap-3">
        <select
          name="country"
          defaultValue={compareAll ? "all" : country}
          className="rounded border p-2 text-sm"
        >
          {options.countries.map((c) => (
            <option key={c} value={c}>{c === LOCAL_COUNTRY ? `${c} (default)` : c}</option>
          ))}
          <option value="all">All countries (comparison)</option>
        </select>
        <button className="rounded border px-4 py-2 text-sm">Apply</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Offers" value={stats.total.toLocaleString("en-US")} hint={country ?? "all countries"} />
        <Kpi label="Top sector" value={stats.sectors[0]?.name ?? "-"} />
        <Kpi label="Top skill" value={stats.skills[0]?.name ?? "-"} />
        <Kpi
          label="Average salary"
          value={stats.salary ? `${stats.salary.avg.toLocaleString("en-US")} TND / month` : "-"}
          hint={salaryHint}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Most requested skills"><HBarChart data={stats.skills} /></Card>
        <Card title="Offers by sector"><HBarChart data={stats.sectors} /></Card>
        <Card title="Offers by city"><HBarChart data={stats.cities} /></Card>
        {compareAll && (
          <>
            <Card title="Offers by country"><HBarChart data={stats.countries} /></Card>
            <Card title="Average monthly salary by country (TND)"><HBarChart data={salaryByCountry} /></Card>
          </>
        )}
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Salary converter</h2>
        <SalaryConverter perTnd={rates.perTnd} />
      </section>

      <p className="mt-8 text-xs opacity-60">
        Salaries are converted to TND per month using daily exchange rates
        {rates.updatedAt ? ` (updated ${rates.updatedAt.toISOString().slice(0, 10)})` : ""}.{" "}
        <a href="https://www.exchangerate-api.com" className="underline">Rates By Exchange Rate API</a>
      </p>
    </main>
  );
}