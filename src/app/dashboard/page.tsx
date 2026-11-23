import Link from "next/link";

import { BriefcaseBusiness, Building2, TrendingDown, TrendingUp, WalletCards, Wrench } from "lucide-react";

import { BracketCompareChart, HBarChart } from "@/components/charts";
import { SalaryConverter } from "@/components/salary-converter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ESTIMATE_MIN_CONFIDENCE, LOCAL_COUNTRY } from "@/lib/config";
import { getRates } from "@/lib/currency";
import { getCurrentUser } from "@/lib/dal";
import { getFilterOptions } from "@/lib/jobs";
import { getPppFactors } from "@/lib/ppp";
import { getAvgSalaryTnd, getSalaryBrackets, getSalaryByCountry, getStats } from "@/lib/stats";

function MetricCard({
  label,
  value,
  hint,
  icon,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-lg border">
            {icon}
          </div>
        </CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-2xl leading-none font-medium tracking-tight tabular-nums">{value}</div>
          {badge}
        </div>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
  const country = compareAll ? undefined : raw && options.countries.includes(raw) ? raw : LOCAL_COUNTRY;

  const [stats, localSalary, salaryByCountry, ppp, brackets] = await Promise.all([
    getStats(country),
    getAvgSalaryTnd(LOCAL_COUNTRY),
    compareAll ? getSalaryByCountry() : Promise.resolve([]),
    getPppFactors(),
    // estimates exist only for local (Tanitjobs) offers
    country === LOCAL_COUNTRY ? getSalaryBrackets(LOCAL_COUNTRY) : Promise.resolve(null),
  ]);
  const statedN = brackets?.reduce((s, b) => s + b.statedN, 0) ?? 0;
  const estimatedN = brackets?.reduce((s, b) => s + b.estimatedN, 0) ?? 0;

  const diff =
    country && country !== LOCAL_COUNTRY && stats.salary && localSalary
      ? Math.round((stats.salary.avg / localSalary.avg - 1) * 100)
      : null;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back, {user.name}.</p>
        </div>
        <form className="flex items-center gap-2">
          <NativeSelect name="country" defaultValue={compareAll ? "all" : country} aria-label="Country">
            {options.countries.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c === LOCAL_COUNTRY ? `${c} (default)` : c}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="all">All countries (comparison)</NativeSelectOption>
          </NativeSelect>
          <Button type="submit">Apply</Button>
        </form>
      </div>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Offers"
          value={stats.total.toLocaleString("en-US")}
          hint={country ?? "All countries"}
          icon={<BriefcaseBusiness className="size-4" />}
        />
        <MetricCard
          label="Top sector"
          value={stats.sectors[0]?.name ?? "-"}
          hint="Most represented sector"
          icon={<Building2 className="size-4" />}
        />
        <MetricCard
          label="Top skill"
          value={stats.skills[0]?.name ?? "-"}
          hint="Most requested skill"
          icon={<Wrench className="size-4" />}
        />
        <MetricCard
          label="Average salary"
          value={stats.salary ? `${stats.salary.avg.toLocaleString("en-US")} TND` : "-"}
          hint={stats.salary ? `Per month · ${stats.salary.n} offers, converted to TND` : "No salary data"}
          icon={<WalletCards className="size-4" />}
          badge={
            diff !== null && (
              <Badge variant={diff >= 0 ? "default" : "destructive"}>
                {diff >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {diff >= 0 ? "+" : ""}
                {diff}% vs {LOCAL_COUNTRY}
              </Badge>
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Most requested skills">
          <HBarChart data={stats.skills} />
        </ChartCard>
        <ChartCard title="Offers by sector">
          <HBarChart data={stats.sectors} />
        </ChartCard>
        <ChartCard
          title="Who the offers are for"
          description={`Internships, entry-level and experienced roles${stats.levelUnknown ? ` · ${stats.levelUnknown.toLocaleString("en-US")} offers not specified` : ""}`}
        >
          <HBarChart data={stats.levels} />
        </ChartCard>
        <ChartCard title="Offers by city">
          <HBarChart data={stats.cities} />
        </ChartCard>
        {brackets && (
          <div className="lg:col-span-2">
            <ChartCard
              title="Salary brackets: stated vs estimated"
              description={
                `Share of offers in each monthly bracket · ${statedN.toLocaleString("en-US")} offers state a salary, ` +
                `${estimatedN.toLocaleString("en-US")} more have a model estimate (confidence ≥ ${ESTIMATE_MIN_CONFIDENCE * 100}%)`
              }
            >
              <BracketCompareChart data={brackets} />
              <p className="text-muted-foreground mt-3 text-xs">
                Estimates come from a model trained on the offers that state a bracket. It picks the right bracket
                about 62% of the time and is at most one bracket off about 94% of the time. They are never used in
                the average salary above.
              </p>
            </ChartCard>
          </div>
        )}
        {compareAll && (
          <>
            <ChartCard title="Offers by country">
              <HBarChart data={stats.countries} />
            </ChartCard>
            <ChartCard title="Average monthly salary by country" description="In TND">
              <HBarChart data={salaryByCountry} label="TND / month" />
            </ChartCard>
          </>
        )}
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Salary converter</CardTitle>
          <CardDescription>Convert a salary into TND per month, or compare it with {LOCAL_COUNTRY}</CardDescription>
        </CardHeader>
        <CardContent>
          <SalaryConverter perTnd={rates.perTnd} ppp={ppp} localAvg={localSalary?.avg ?? null} />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Salaries are converted to TND per month using daily exchange rates
        {rates.updatedAt ? ` (updated ${rates.updatedAt.toISOString().slice(0, 10)})` : ""}.{" "}
        <Link href="https://www.exchangerate-api.com" className="underline">
          Rates By Exchange Rate API
        </Link>
      </p>
    </div>
  );
}
