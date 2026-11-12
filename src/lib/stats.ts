import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ChartDatum = { name: string; value: number };

const MONTHLY_TND = Prisma.sql`
  (("salaryMin" + "salaryMax") / 2.0)
  / (CASE WHEN o."salaryPeriod" = 'YEAR' THEN 12 ELSE 1 END)
  * r."perTnd"`;

export async function getAvgSalaryTnd(country?: string) {
  const countrySql = country ? Prisma.sql`AND o.country = ${country}` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT ROUND(AVG(${MONTHLY_TND}))::int AS avg, COUNT(*)::int AS n
    FROM "JobOffer" o
    JOIN "ExchangeRate" r ON r.currency = o.currency
    JOIN "Source" s ON s.id = o."sourceId"
    WHERE o."salaryMin" IS NOT NULL AND o."salaryMax" IS NOT NULL
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
    WHERE o."salaryMin" IS NOT NULL AND o."salaryMax" IS NOT NULL
      AND o."salaryPeriod" IS NOT NULL
    GROUP BY o.country
    HAVING COUNT(*) >= 3
    ORDER BY value DESC
    LIMIT 10`;
  return rows;
}

export async function getStats(country?: string) {
  const scope: Prisma.JobOfferWhereInput = country ? { country } : {};
  const countrySql = country ? Prisma.sql`AND country = ${country}` : Prisma.empty;

  const [total, sectorRows, cityRows, countryRows, skillRows, salary] =
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
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
      prisma.$queryRaw<{ name: string; value: bigint }[]>`
        SELECT skill AS name, COUNT(*) AS value
        FROM "JobOffer", unnest(skills) AS skill
        WHERE TRUE ${countrySql}
        GROUP BY skill
        ORDER BY value DESC
        LIMIT 10`,
      getAvgSalaryTnd(country),
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
  };
}