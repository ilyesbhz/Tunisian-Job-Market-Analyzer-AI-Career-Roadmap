import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PAGE_SIZE = 20;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().catch(undefined);

const filtersSchema = z.object({
  q: optionalText(100),
  country: optionalText(60),
  city: optionalText(60),
  sector: optionalText(60),
  skill: optionalText(60),
  page: z.coerce.number().int().min(1).catch(1),
});

export type JobFilters = z.infer<typeof filtersSchema>;

export function parseFilters(raw: Record<string, string | string[] | undefined>): JobFilters {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, (Array.isArray(v) ? v[0] : v) || undefined])
  );
  return filtersSchema.parse(flat);
}

export async function getJobs(f: JobFilters) {
  const where: Prisma.JobOfferWhereInput = {
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { company: { contains: f.q, mode: "insensitive" } },
      ],
    }),
    ...(f.country && f.country !== "all" && { country: f.country }),    ...(f.city && { city: { contains: f.city, mode: "insensitive" } }),
    ...(f.sector && { sector: f.sector }),
    ...(f.skill && { skills: { has: f.skill } }),
  };

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
      distinct: ["country"],
      orderBy: { country: "asc" },
    }),
    prisma.jobOffer.findMany({
      select: { sector: true },
      where: { sector: { not: null } },
      distinct: ["sector"],
      orderBy: { sector: "asc" },
    }),
  ]);
  return {
    countries: countries.map((c) => c.country),
    sectors: sectors.map((s) => s.sector as string),
  };
}