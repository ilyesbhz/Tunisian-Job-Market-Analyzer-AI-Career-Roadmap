import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JOB_LEVEL_KEYS, type JobLevelKey } from "@/lib/levels";

export const PAGE_SIZE = 20;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().catch(undefined);

const filtersSchema = z.object({
  q: optionalText(100),
  country: optionalText(60),
  city: optionalText(60),
  sector: optionalText(60),
  skill: optionalText(60),
  level: z.enum(JOB_LEVEL_KEYS as [JobLevelKey, ...JobLevelKey[]]).optional().catch(undefined),
  expired: z.literal("1").optional().catch(undefined), // "1" = also show offers past their deadline
  page: z.coerce.number().int().min(1).catch(1),
});

export type JobFilters = z.infer<typeof filtersSchema>;

// The filters a saved search keeps (paging and the "show expired" toggle are not part of a search)
export const SEARCH_FILTER_KEYS = ["q", "country", "city", "sector", "skill", "level"] as const;
export type SearchFilters = Pick<JobFilters, (typeof SEARCH_FILTER_KEYS)[number]>;

export function toSearchFilters(f: Partial<JobFilters>): SearchFilters {
  const out: SearchFilters = {};
  for (const k of SEARCH_FILTER_KEYS) if (f[k]) Object.assign(out, { [k]: f[k] });
  return out;
}

export function parseFilters(raw: Record<string, string | string[] | undefined>): JobFilters {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, (Array.isArray(v) ? v[0] : v) || undefined])
  );
  return filtersSchema.parse(flat);
}

// Start of today in UTC: deadlines are stored as UTC midnight, so an offer is open through its last day
export function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Offers whose deadline has not passed (or that have no deadline)
export const openOffers = (): Prisma.JobOfferWhereInput => ({
  OR: [{ validThrough: null }, { validThrough: { gte: startOfTodayUtc() } }],
});

// One definition of "offers matching these filters", shared by the jobs page and saved searches
export function buildJobsWhere(f: SearchFilters & { expired?: "1" }): Prisma.JobOfferWhereInput {
  return {
    isActive: true,
    ...(!f.expired && { AND: [openOffers()] }),
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { company: { contains: f.q, mode: "insensitive" } },
      ],
    }),
    ...(f.country && f.country !== "all" && { country: f.country }),
    ...(f.city && { city: { contains: f.city, mode: "insensitive" } }),
    ...(f.sector && { sector: f.sector }),
    ...(f.skill && { skills: { has: f.skill } }),
    ...(f.level && { level: f.level }),
  };
}

export async function getJobs(f: JobFilters) {
  const where = buildJobsWhere(f);

  const [total, jobs] = await Promise.all([
    prisma.jobOffer.count({ where }),
    prisma.jobOffer.findMany({
      where,
      include: { source: { select: { name: true } } },
      orderBy: [{ postedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return { jobs, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFilterOptions() {
  const [countries, sectors] = await Promise.all([
    prisma.jobOffer.findMany({
      select: { country: true },
      where: { isActive: true },
      distinct: ["country"],
      orderBy: { country: "asc" },
    }),
    prisma.jobOffer.findMany({
      select: { sector: true },
      where: { isActive: true, sector: { not: null } },
      distinct: ["sector"],
      orderBy: { sector: "asc" },
    }),
  ]);
  return {
    countries: countries.map((c) => c.country),
    sectors: sectors.map((s) => s.sector as string),
  };
}