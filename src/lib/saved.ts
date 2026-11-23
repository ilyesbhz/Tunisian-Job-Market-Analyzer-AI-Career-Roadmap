import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { buildJobsWhere, type SearchFilters, startOfTodayUtc, toSearchFilters } from "@/lib/jobs";
import { JOB_LEVELS } from "@/lib/levels";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEADLINE_SOON_DAYS = 3; // remind about saved offers closing within this many days
const RECENTLY_CLOSED_DAYS = 7; // tell about saved offers that closed in the last week

export async function getFavoriteIds(userId: number, jobIds: number[]): Promise<Set<number>> {
  if (jobIds.length === 0) return new Set();
  const rows = await prisma.favorite.findMany({
    where: { userId, jobOfferId: { in: jobIds } },
    select: { jobOfferId: true },
  });
  return new Set(rows.map((r) => r.jobOfferId));
}

// "Data analyst · Tunisia · Entry level"
export function describeSearch(f: SearchFilters): string {
  const parts = [
    f.q && `"${f.q}"`,
    f.country === "all" ? "All countries" : f.country,
    f.city,
    f.sector,
    f.skill && `skill: ${f.skill}`,
    f.level && JOB_LEVELS[f.level].label,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All offers";
}

export function searchHref(f: SearchFilters): string {
  const sp = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
  return `/dashboard/jobs${sp.size ? `?${sp}` : ""}`;
}

/** Saved searches with the number of open offers that appeared since each was last opened. */
export async function getSavedSearches(userId: number) {
  const searches = await prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return Promise.all(
    searches.map(async (s) => {
      const filters = toSearchFilters(s.filters as SearchFilters);
      const where = buildJobsWhere(filters);
      const [total, newCount] = await Promise.all([
        prisma.jobOffer.count({ where }),
        prisma.jobOffer.count({ where: { AND: [where, { firstSeenAt: { gt: s.lastCheckedAt } }] } }),
      ]);
      return { ...s, filters, total, newCount, description: describeSearch(filters), href: searchHref(filters) };
    }),
  );
}

export type Notification =
  | { kind: "new-offers"; key: string; searchId: number; name: string; count: number }
  | { kind: "deadline"; key: string; jobId: number; title: string; daysLeft: number; url: string | null }
  | { kind: "closed"; key: string; jobId: number; title: string };

/** Everything worth telling the user right now. Cached per request (layout and pages share it). */
export const getNotifications = cache(async (userId: number): Promise<Notification[]> => {
  const today = startOfTodayUtc();
  const soonLimit = new Date(today.getTime() + DEADLINE_SOON_DAYS * DAY_MS);
  const closedSince = new Date(today.getTime() - RECENTLY_CLOSED_DAYS * DAY_MS);

  const [searches, closingSoon, closed] = await Promise.all([
    getSavedSearches(userId),
    prisma.favorite.findMany({
      where: { userId, jobOffer: { isActive: true, validThrough: { gte: today, lte: soonLimit } } },
      select: { jobOffer: { select: { id: true, title: true, url: true, validThrough: true } } },
      orderBy: { jobOffer: { validThrough: "asc" } },
    }),
    prisma.favorite.findMany({
      where: {
        userId,
        jobOffer: {
          OR: [
            { validThrough: { gte: closedSince, lt: today } }, // deadline passed recently
            { isActive: false, lastImportedAt: { gte: closedSince } }, // removed from the source recently
          ],
        },
      },
      select: { jobOffer: { select: { id: true, title: true } } },
    }),
  ]);

  return [
    ...searches
      .filter((s) => s.newCount > 0)
      .map((s) => ({ kind: "new-offers" as const, key: `s${s.id}`, searchId: s.id, name: s.name, count: s.newCount })),
    ...closingSoon.map(({ jobOffer: j }) => ({
      kind: "deadline" as const,
      key: `d${j.id}`,
      jobId: j.id,
      title: j.title,
      url: j.url,
      daysLeft: Math.round(((j.validThrough as Date).getTime() - today.getTime()) / DAY_MS),
    })),
    ...closed.map(({ jobOffer: j }) => ({ kind: "closed" as const, key: `c${j.id}`, jobId: j.id, title: j.title })),
  ];
});
