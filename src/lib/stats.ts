import { Prisma } from "@prisma/client";
import { ESTIMATE_MIN_CONFIDENCE, SALARY_BRACKETS } from "@/lib/config";
import { prisma } from "@/lib/db";
import { JOB_LEVEL_KEYS, JOB_LEVELS } from "@/lib/levels";

export type ChartDatum = { name: string; value: number };

export type BracketDatum = { name: string; stated: number; estimated: number; statedN: number; estimatedN: number };

// Share of active TND offers in each monthly bracket: offers that STATE a salary next to offers whose
// salary is a model estimate. Shares are within each group, so the two distributions can be compared
// (they are never added up). Stated brackets use the lower bound, as Tanitjobs publishes them.
export async function getSalaryBrackets(country: string): Promise<BracketDatum[] | null> {
  const rows = await prisma.$queryRaw<{ bracket: string; stated: number; estimated: number }[]>`
    WITH o AS (
      SELECT CASE WHEN "salaryMin" IS NOT NULL THEN
               CASE WHEN "salaryMin" / (CASE WHEN "salaryPeriod" = 'MONTH' THEN 1 ELSE 12 END) < 1000 THEN '<1000'
                    WHEN "salaryMin" / (CASE WHEN "salaryPeriod" = 'MONTH' THEN 1 ELSE 12 END) < 1500 THEN '1000-1500'
                    WHEN "salaryMin" / (CASE WHEN "salaryPeriod" = 'MONTH' THEN 1 ELSE 12 END) < 2000 THEN '1500-2000'
                    ELSE '>=2000' END
             END AS stated,
             CASE WHEN "salaryMin" IS NULL AND "estimatedSalaryConfidence" >= ${ESTIMATE_MIN_CONFIDENCE}
                  THEN "estimatedSalaryBracket" END AS estimated
      FROM "JobOffer"
      WHERE "isActive" AND country = ${country}
        AND (("salaryMin" IS NOT NULL AND currency = 'TND') OR "estimatedSalaryBracket" IS NOT NULL)
    )
    SELECT b AS bracket,
           COUNT(*) FILTER (WHERE stated = b)::int AS stated,
           COUNT(*) FILTER (WHERE estimated = b)::int AS estimated
    FROM o CROSS JOIN unnest(${[...SALARY_BRACKETS]}::text[]) AS b
    GROUP BY b`;
  const statedTotal = rows.reduce((s, r) => s + r.stated, 0);
  const estimatedTotal = rows.reduce((s, r) => s + r.estimated, 0);
  if (estimatedTotal === 0) return null;
  const pct = (n: number, total: number) => (total ? Math.round((1000 * n) / total) / 10 : 0);
  return SALARY_BRACKETS.map((b) => {
    const r = rows.find((x) => x.bracket === b) ?? { stated: 0, estimated: 0 };
    return {
      name: `${b} TND`,
      stated: pct(r.stated, statedTotal),
      estimated: pct(r.estimated, estimatedTotal),
      statedN: r.stated,
      estimatedN: r.estimated,
    };
  });
}

const MONTHLY_TND = Prisma.sql`
  (("salaryMin" + "salaryMax") / 2.0)
  / (CASE WHEN o."salaryPeriod" = 'YEAR' THEN 12 ELSE 1 END)
  / r."perTnd"`;

export async function getAvgSalaryTnd(country?: string) {
  const countrySql = country ? Prisma.sql`AND o.country = ${country}` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT ROUND(AVG(${MONTHLY_TND}))::int AS avg, COUNT(*)::int AS n
    FROM "JobOffer" o
    JOIN "ExchangeRate" r ON r.currency = o.currency
    JOIN "Source" s ON s.id = o."sourceId"
    WHERE o."isActive" AND o."salaryMin" IS NOT NULL AND o."salaryMax" IS NOT NULL
      AND o."salaryPeriod" IS NOT NULL
      AND s.name = 'Tanitjobs' ${countrySql}`;
  const row = rows[0];
  return row?.avg ? { avg: row.avg, n: row.n } : null;
}

export async function getSalaryByCountry(): Promise<ChartDatum[]> {
  const rows = await prisma.$queryRaw<{ name: string; value: number }[]>`
    SELECT o.country AS name, ROUND(AVG(${MONTHLY_TND}))::int AS value
    FROM "JobOffer" o
    JOIN "ExchangeRate" r ON r.currency = o.currency
    WHERE o."isActive" AND o."salaryMin" IS NOT NULL AND o."salaryMax" IS NOT NULL
      AND o."salaryPeriod" IS NOT NULL
    GROUP BY o.country
    HAVING COUNT(*) >= 3
    ORDER BY value DESC
    LIMIT 10`;
  return rows;
}

export async function getStats(country?: string) {
  // Only offers from the latest import count towards the market figures
  const scope: Prisma.JobOfferWhereInput = country ? { isActive: true, country } : { isActive: true };
  const countrySql = country ? Prisma.sql`AND country = ${country}` : Prisma.empty;

  const [total, sectorRows, cityRows, countryRows, skillRows, salary, levelRows] =
    await Promise.all([
      prisma.jobOffer.count({ where: scope }),
      prisma.jobOffer.groupBy({
        by: ["sector"],
        where: { ...scope, sector: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { sector: "desc" } },
        take: 10,
      }),
      prisma.jobOffer.groupBy({
        by: ["city"],
        where: { ...scope, city: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 10,
      }),
      prisma.jobOffer.groupBy({
        by: ["country"],
        where: { isActive: true },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
      prisma.$queryRaw<{ name: string; value: bigint }[]>`
        SELECT skill AS name, COUNT(*) AS value
        FROM "JobOffer", unnest(skills) AS skill
        WHERE "isActive" ${countrySql}
        GROUP BY skill
        ORDER BY value DESC
        LIMIT 10`,
      getAvgSalaryTnd(country),
      prisma.jobOffer.groupBy({ by: ["level"], where: scope, _count: { _all: true } }),
    ]);

  const toData = (rows: { name: string | null; n: number }[]): ChartDatum[] =>
    rows.map((r) => ({ name: r.name as string, value: r.n }));

  return {
    total,
    sectors: toData(sectorRows.map((r) => ({ name: r.sector, n: r._count._all }))),
    cities: toData(cityRows.map((r) => ({ name: r.city, n: r._count._all }))),
    countries: toData(countryRows.map((r) => ({ name: r.country, n: r._count._all }))),
    skills: skillRows.map((r) => ({ name: r.name, value: Number(r.value) })),
    salary,
    // Fixed order (internship -> experienced) so the chart reads as a career path
    levels: JOB_LEVEL_KEYS.map((key) => ({
      name: JOB_LEVELS[key].label,
      value: levelRows.find((r) => r.level === key)?._count._all ?? 0,
    })),
    levelUnknown: levelRows.find((r) => r.level === null)?._count._all ?? 0,
  };
}