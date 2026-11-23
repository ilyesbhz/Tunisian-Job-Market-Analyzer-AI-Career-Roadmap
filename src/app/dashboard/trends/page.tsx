import Link from "next/link";

import { Info, TrendingDown, TrendingUp } from "lucide-react";

import { DailyTrendChart, HBarChart } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/dal";
import { getTrends, TREND_COUNTRIES, type TrendCountry } from "@/lib/trends";

const fmt = (n: number) => n.toLocaleString("en-US");
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Stat tile: proportional figures at display size (tabular-nums only where numbers align in columns)
function StatTile({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <Card className="gap-1 shadow-xs">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl leading-none font-medium tracking-tight">{value}</p>
        {hint && <div className="text-muted-foreground text-sm">{hint}</div>}
      </CardContent>
    </Card>
  );
}

// Every chart has a table twin, so no value depends on hover or on telling colors apart
function TableView({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-3">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs select-none">
        Show as table
      </summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-lg border">{children}</div>
    </details>
  );
}

// Pay percentile, 50 = typical salary of that country: a thin bar from the middle shows above/below
function PayCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  const above = value >= 50;
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-right tabular-nums">{Math.round(value)}</span>
      <span aria-hidden className="bg-muted relative h-1.5 w-20 rounded-full">
        <span className="bg-border absolute top-[-2px] left-1/2 h-2.5 w-px" />
        <span
          className={`absolute top-0 h-1.5 rounded-full ${above ? "bg-foreground/70" : "bg-muted-foreground/50"}`}
          style={above ? { left: "50%", width: `${value - 50}%` } : { right: "50%", width: `${50 - value}%` }}
        />
      </span>
    </div>
  );
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getCurrentUser();
  const raw = (await searchParams).country;
  const country: TrendCountry = raw === "fr" || raw === "gb" ? raw : "tn";
  const t = await getTrends(country);
  const name = TREND_COUNTRIES[country].name;
  const money = (n: number | null) => (n == null ? "-" : `${fmt(n)} ${t.currency}`);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Market trends</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            How the job market is moving, from every offer our pipeline has collected
            {t.overview ? ` (${dateFmt.format(new Date(t.overview.firstPosting))} to ${dateFmt.format(new Date(t.overview.lastPosting))})` : ""}.
          </p>
        </div>
        {/* One filter row above everything it scopes */}
        <nav aria-label="Country" className="flex gap-2">
          {(Object.keys(TREND_COUNTRIES) as TrendCountry[]).map((c) => (
            <Button key={c} asChild variant={c === country ? "default" : "outline"} size="sm">
              <Link href={`/dashboard/trends?country=${c}`} aria-current={c === country ? "page" : undefined}>
                {TREND_COUNTRIES[c].name}
              </Link>
            </Button>
          ))}
        </nav>
      </div>

      {!t.overview ? (
        <Card className="shadow-xs">
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No analytics yet. Run the pipeline export to create data/analytics.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Active offers" value={fmt(t.overview.activeJobs)} hint={`in ${name}`} />
            <StatTile label="Companies hiring" value={fmt(t.overview.companies)} hint="Posted at least one offer" />
            <StatTile
              label="Median stated salary"
              value={t.overview.medianMonthly ? `${fmt(t.overview.medianMonthly)} ${t.currency}` : "-"}
              hint={`Per month · ${t.overview.pctWithSalary}% of offers state one`}
            />
            {t.lastWeek ? (
              <StatTile
                label="New offers per day"
                value={fmt(t.lastWeek.perDay)}
                hint={
                  t.lastWeek.change != null && (
                    <span className="flex items-center gap-1.5">
                      <Badge variant={t.lastWeek.change >= 0 ? "secondary" : "outline"}>
                        {t.lastWeek.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                        {t.lastWeek.change >= 0 ? "+" : ""}
                        {t.lastWeek.change}%
                      </Badge>
                      last 7 days vs the week before
                    </span>
                  )
                }
              />
            ) : (
              <StatTile label="New offers per day" value="-" hint="Daily data is collected for Tunisia only" />
            )}
          </div>

          {t.daily.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>New offers per day</CardTitle>
                <CardDescription>Weekends are quieter, so follow the 7-day average for the trend.</CardDescription>
              </CardHeader>
              <CardContent>
                <DailyTrendChart data={t.daily} />
                <TableView>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead className="text-right">New offers</TableHead>
                        <TableHead className="text-right">7-day average</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...t.daily].reverse().map((d) => (
                        <TableRow key={d.day}>
                          <TableCell>{dateFmt.format(new Date(d.day))}</TableCell>
                          <TableCell className="text-right tabular-nums">{d.newJobs ?? "no data"}</TableCell>
                          <TableCell className="text-right tabular-nums">{d.avg7 ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableView>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {t.topTools.length > 0 && (
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle>Most requested tools</CardTitle>
                  <CardDescription>Number of offers naming each tool</CardDescription>
                </CardHeader>
                <CardContent>
                  <HBarChart data={t.topTools} label="Offers" />
                  <TableView>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tool</TableHead>
                          <TableHead className="text-right">Offers</TableHead>
                          <TableHead className="text-right">Share of offers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {t.topTools.map((tool) => (
                          <TableRow key={tool.name}>
                            <TableCell>{tool.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(tool.value)}</TableCell>
                            <TableCell className="text-right tabular-nums">{tool.share != null ? `${tool.share}%` : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableView>
                </CardContent>
              </Card>
            )}

            {t.seniority.length > 0 && (
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle>Salary by experience level</CardTitle>
                  <CardDescription>Median stated salary, {t.currency} per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <HBarChart data={t.seniority} label={`${t.currency} / month`} />
                  <TableView>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Level</TableHead>
                          <TableHead className="text-right">Median per month</TableHead>
                          <TableHead className="text-right">Offers with a salary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {t.seniority.map((s) => (
                          <TableRow key={s.name}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(s.value)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(s.n)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableView>
                  {t.seniority.some((s) => s.n < 30) && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Some levels rest on few offers ({t.seniority.filter((s) => s.n < 30).map((s) => `${s.name}: ${s.n}`).join(", ")}): read them as a rough guide.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="py-0 shadow-xs">
            <CardHeader className="pt-4">
              <CardTitle>Sectors in {name}</CardTitle>
              <CardDescription>
                Pay level: where the sector&apos;s salaries sit in {name} (50 = typical, higher = better paid).
                {country !== "tn" && " Offer counts depend on our sampling, so compare these sectors on pay."}
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4">Sector</TableHead>
                  <TableHead className="text-right">Active offers</TableHead>
                  <TableHead className="text-right">Median salary / month</TableHead>
                  <TableHead className="px-4">Pay level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.sectors.map((s) => (
                  <TableRow key={s.sector}>
                    <TableCell className="px-4 font-medium">{s.sector}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(s.activeJobs)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(s.medianMonthly)}
                      <span className="text-muted-foreground block text-xs">{fmt(s.withSalary)} with salary</span>
                    </TableCell>
                    <TableCell className="px-4">
                      <PayCell value={s.payPercentile} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {t.payBySector.length > 0 && (
            <Card className="py-0 shadow-xs">
              <CardHeader className="pt-4">
                <CardTitle>Which sectors pay well, country by country</CardTitle>
                <CardDescription>
                  Pay level within each country (50 = typical there). It compares sectors across countries without
                  converting currencies or cost of living.
                </CardDescription>
              </CardHeader>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="px-4">Sector</TableHead>
                    {(Object.keys(TREND_COUNTRIES) as TrendCountry[]).map((c) => (
                      <TableHead key={c}>{TREND_COUNTRIES[c].name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {t.payBySector.map((r) => (
                    <TableRow key={r.sector}>
                      <TableCell className="px-4 font-medium">{r.sector}</TableCell>
                      {(Object.keys(TREND_COUNTRIES) as TrendCountry[]).map((c) => (
                        <TableCell key={c}>
                          <PayCell value={r[c]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4" /> How to read these numbers
              </CardTitle>
              {t.generatedAt && <CardDescription>Updated {dateFmt.format(new Date(t.generatedAt))}</CardDescription>}
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {t.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
