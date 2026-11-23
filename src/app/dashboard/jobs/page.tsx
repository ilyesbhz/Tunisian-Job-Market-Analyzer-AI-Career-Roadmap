import Link from "next/link";

import { ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, MapPin, RotateCcw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESTIMATE_MIN_CONFIDENCE, LOCAL_COUNTRY } from "@/lib/config";
import { getRates } from "@/lib/currency";
import { getCurrentUser } from "@/lib/dal";
import { getFilterOptions, getJobs, parseFilters, toSearchFilters } from "@/lib/jobs";
import { JOB_LEVEL_KEYS, JOB_LEVELS, type JobLevelKey } from "@/lib/levels";
import { getPppFactors, type PppFactors } from "@/lib/ppp";
import { describeSearch, getFavoriteIds } from "@/lib/saved";
import { getAvgSalaryTnd } from "@/lib/stats";

import { SaveJobButton } from "../saved/_components/save-job-button";
import { SaveSearchButton } from "../saved/_components/save-search-button";

import { ConvertSalaryButton } from "./_components/convert-salary-button";

type Job = Awaited<ReturnType<typeof getJobs>>["jobs"][number];
type Rates = Awaited<ReturnType<typeof getRates>>;
type CompareData = { rates: Rates; ppp: PppFactors; localAvg: number | null };

const fmt = (n: number) => n.toLocaleString("en-US");
const range = (lo: number, hi: number | null) => (hi == null || hi === lo ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`);

// Model estimate for an offer that states no salary: monthly bracket, clearly marked as estimated
function EstimatedSalary({ job }: { job: Job }) {
  const conf = job.estimatedSalaryConfidence;
  if (!job.estimatedSalaryBracket || job.estimatedSalaryCurrency !== "TND" || conf == null || conf < ESTIMATE_MIN_CONFIDENCE)
    return <span className="text-muted-foreground">-</span>;
  const lo = Math.round((job.estimatedSalaryMin ?? 0) / 12);
  const hi = job.estimatedSalaryMax == null ? null : Math.round(job.estimatedSalaryMax / 12);
  const text = hi == null ? `${fmt(lo)}+` : lo === 0 ? `under ${fmt(hi)}` : `${fmt(lo)} - ${fmt(hi)}`;
  return (
    <div
      className="flex flex-col items-start gap-1 tabular-nums"
      title={`Not stated in the offer. Estimated by a model from similar offers (confidence ${Math.round(conf * 100)}%).`}
    >
      <div className="text-muted-foreground">
        <span className="font-medium">≈ {text}</span> TND / month
      </div>
      <Badge variant="outline" className="text-muted-foreground border-dashed">
        Estimated · {Math.round(conf * 100)}%
      </Badge>
    </div>
  );
}

function SalaryCell({ job, compare }: { job: Job; compare: CompareData }) {
  if (job.salaryMin == null || !job.currency) return <EstimatedSalary job={job} />;
  const period = job.salaryPeriod ?? "YEAR";

  // Tunisian offers: monthly TND, as quoted locally
  if (job.currency === "TND") {
    const perMonth = (v: number) => (period === "YEAR" ? Math.round(v / 12) : v);
    return (
      <div className="tabular-nums">
        <span className="font-medium">
          {range(perMonth(job.salaryMin), job.salaryMax == null ? null : perMonth(job.salaryMax))}
        </span>{" "}
        <span className="text-muted-foreground">TND / month</span>
      </div>
    );
  }

  // Foreign offers: original salary, with an on-demand comparison to Tunisia
  return (
    <div className="flex flex-col items-start gap-1.5 tabular-nums">
      <div>
        <span className="font-medium">{range(job.salaryMin, job.salaryMax)}</span>{" "}
        <span className="text-muted-foreground">
          {job.currency} / {period === "YEAR" ? "year" : "month"}
        </span>
      </div>
      <ConvertSalaryButton
        title={job.title}
        country={job.country}
        currency={job.currency}
        salaryMin={job.salaryMin}
        salaryMax={job.salaryMax ?? job.salaryMin}
        period={period}
        perTnd={compare.rates.perTnd}
        ppp={compare.ppp}
        localAvg={compare.localAvg}
      />
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Whole days between today (UTC) and a stored date (stored as UTC midnight)
function daysFromToday(date: Date) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((date.getTime() - todayUtc) / DAY_MS);
}

function PostedCell({ date }: { date: Date | null }) {
  if (!date) return <span className="text-muted-foreground">-</span>;
  const ago = -daysFromToday(date);
  return (
    <div className="whitespace-nowrap">
      <div>{dateFmt.format(date)}</div>
      <div className="text-muted-foreground text-xs">
        {ago <= 0 ? "Today" : ago === 1 ? "Yesterday" : `${ago} days ago`}
      </div>
    </div>
  );
}

function DeadlineCell({ date }: { date: Date | null }) {
  if (!date) return <span className="text-muted-foreground">-</span>;
  const left = daysFromToday(date);
  return (
    <div className="flex flex-col items-start gap-1 whitespace-nowrap">
      <span>{dateFmt.format(date)}</span>
      {left < 0 ? (
        <Badge variant="destructive">Expired</Badge>
      ) : left === 0 ? (
        <Badge variant="destructive">Last day</Badge>
      ) : left <= 7 ? (
        <Badge variant="secondary">{left === 1 ? "1 day left" : `${left} days left`}</Badge>
      ) : null}
    </div>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  if (!filters.country) filters.country = LOCAL_COUNTRY;
  const [{ jobs, total, pages }, options, rates, ppp, localSalary] = await Promise.all([
    getJobs(filters),
    getFilterOptions(),
    getRates(),
    getPppFactors(),
    getAvgSalaryTnd(LOCAL_COUNTRY),
  ]);
  const compare: CompareData = { rates, ppp, localAvg: localSalary?.avg ?? null };
  const savedIds = await getFavoriteIds(user.id, jobs.map((j) => j.id));
  const searchFilters = toSearchFilters(filters);

  // Builds a link that keeps the current filters, with some of them overridden
  const linkWith = (overrides: Partial<Record<keyof typeof filters, string | number | undefined>>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page: undefined, ...overrides })) {
      if (v) sp.set(k, String(v));
    }
    const qs = sp.toString();
    return qs ? `/dashboard/jobs?${qs}` : "/dashboard/jobs";
  };
  const pageLink = (p: number) => linkWith({ page: p });

  const levelTabs: { key: JobLevelKey | undefined; label: string; hint?: string }[] = [
    { key: undefined, label: "All offers" },
    ...JOB_LEVEL_KEYS.map((key) => ({ key, label: JOB_LEVELS[key].label, hint: JOB_LEVELS[key].audience })),
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Job offers</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-muted-foreground text-sm">
            {total.toLocaleString("en-US")} matching {filters.expired ? "offers, including expired ones" : "open offers"}
          </p>
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link href={linkWith({ expired: filters.expired ? undefined : "1" })}>
              {filters.expired ? <EyeOff /> : <Eye />}
              {filters.expired ? "Hide expired offers" : "Show expired offers"}
            </Link>
          </Button>
        </div>
      </div>
        <SaveSearchButton
          filters={searchFilters as Record<string, string>}
          defaultName={describeSearch(searchFilters)}
        />
      </div>

      <nav aria-label="Offer level" className="flex flex-wrap gap-2">
        {levelTabs.map((tab) => {
          const active = filters.level === tab.key;
          return (
            <Button key={tab.label} asChild variant={active ? "default" : "outline"} size="lg">
              <Link href={linkWith({ level: tab.key })} aria-current={active ? "page" : undefined}>
                {tab.label}
                {tab.hint && (
                  <span className={active ? "text-primary-foreground/70 text-xs" : "text-muted-foreground text-xs"}>
                    {tab.hint}
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </nav>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow down offers by keyword, location, sector or skill.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
            {filters.level && <input type="hidden" name="level" value={filters.level} />}
            {filters.expired && <input type="hidden" name="expired" value="1" />}
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input name="q" defaultValue={filters.q} placeholder="Title or company" className="pl-8" aria-label="Search" />
            </div>
            <NativeSelect name="country" defaultValue={filters.country} aria-label="Country">
              {options.countries.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value="all">All countries</NativeSelectOption>
            </NativeSelect>
            <Input name="city" defaultValue={filters.city} placeholder="City" aria-label="City" />
            <NativeSelect name="sector" defaultValue={filters.sector ?? ""} aria-label="Sector">
              <NativeSelectOption value="">All sectors</NativeSelectOption>
              {options.sectors.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {s}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input name="skill" defaultValue={filters.skill} placeholder="Skill" aria-label="Skill" />
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <Button asChild variant="outline" size="icon" aria-label="Reset filters">
                <Link href="/dashboard/jobs">
                  <RotateCcw />
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="py-0 shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10 pr-0 pl-2">
                <span className="sr-only">Save</span>
              </TableHead>
              <TableHead className="px-4">Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="px-4">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id} className="align-top">
                <TableCell className="pr-0 pl-2">
                  <SaveJobButton jobId={j.id} title={j.title} saved={savedIds.has(j.id)} />
                </TableCell>
                <TableCell className="max-w-72 px-4 whitespace-normal">
                  {j.url ? (
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary group/title font-medium underline-offset-4 hover:underline"
                    >
                      {j.title}
                      <ExternalLink
                        aria-label="(opens the original offer in a new tab)"
                        className="text-muted-foreground group-hover/title:text-primary ml-1 inline size-3.5 align-[-2px]"
                      />
                    </a>
                  ) : (
                    <div className="font-medium">{j.title}</div>
                  )}
                  {j.level && (
                    <Badge variant={j.level === "EXPERIENCED" ? "outline" : "secondary"} className="mt-1">
                      {JOB_LEVELS[j.level].label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{j.company ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">
                  <span className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {[j.city, j.country].filter(Boolean).join(", ")}
                  </span>
                </TableCell>
                <TableCell>{j.sector ? <Badge variant="outline">{j.sector}</Badge> : "-"}</TableCell>
                <TableCell>
                  <SalaryCell job={j} compare={compare} />
                </TableCell>
                <TableCell>
                  <PostedCell date={j.postedAt} />
                </TableCell>
                <TableCell>
                  <DeadlineCell date={j.validThrough} />
                </TableCell>
                <TableCell className="text-muted-foreground px-4">{j.source.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {jobs.length === 0 && (
          <p className="text-muted-foreground px-5 pb-10 text-center text-sm">No offers match these filters.</p>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          Page {filters.page} of {pages}
        </span>
        <div className="flex gap-2">
          {filters.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageLink(filters.page - 1)}>
                <ChevronLeft /> Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft /> Previous
            </Button>
          )}
          {filters.page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageLink(filters.page + 1)}>
                Next <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next <ChevronRight />
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        <Link href="https://www.exchangerate-api.com" className="underline">
          Rates By Exchange Rate API
        </Link>
      </p>
    </div>
  );
}
