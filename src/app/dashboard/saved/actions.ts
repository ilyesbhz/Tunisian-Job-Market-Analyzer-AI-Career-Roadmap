"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { parseFilters, toSearchFilters } from "@/lib/jobs";
import { describeSearch, searchHref } from "@/lib/saved";

const MAX_SAVED_SEARCHES = 20;

/** Saves or un-saves an offer. Returns whether it is saved afterwards. */
export async function toggleFavorite(jobOfferId: number): Promise<boolean> {
  const user = await getCurrentUser();
  if (!Number.isInteger(jobOfferId)) return false;

  const key = { userId_jobOfferId: { userId: user.id, jobOfferId } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) {
    await prisma.favorite.delete({ where: key });
  } else {
    const offer = await prisma.jobOffer.findUnique({ where: { id: jobOfferId }, select: { id: true } });
    if (!offer) return false;
    await prisma.favorite.create({ data: { userId: user.id, jobOfferId } });
  }
  revalidatePath("/dashboard", "layout"); // notification bell + saved page
  return !existing;
}

export type SaveSearchState = { ok?: boolean; message?: string } | undefined;

export async function saveSearch(_prev: SaveSearchState, formData: FormData): Promise<SaveSearchState> {
  const user = await getCurrentUser();

  let raw: Record<string, string>;
  try {
    raw = z.record(z.string(), z.string()).parse(JSON.parse(String(formData.get("filters") ?? "{}")));
  } catch {
    return { message: "These filters could not be saved." };
  }
  const filters = toSearchFilters(parseFilters(raw));
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || describeSearch(filters);

  const count = await prisma.savedSearch.count({ where: { userId: user.id } });
  if (count >= MAX_SAVED_SEARCHES) {
    return { message: `You can keep up to ${MAX_SAVED_SEARCHES} saved searches. Delete one first.` };
  }

  await prisma.savedSearch.create({ data: { userId: user.id, name, filters } });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Search saved. You will be told about new matching offers." };
}

export async function deleteSearch(formData: FormData) {
  const user = await getCurrentUser();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard", "layout");
}

/** Opens a saved search: its new offers count as seen from now on. */
export async function openSearch(formData: FormData) {
  const user = await getCurrentUser();
  const id = Number(formData.get("id"));
  const search = Number.isInteger(id)
    ? await prisma.savedSearch.findFirst({ where: { id, userId: user.id } })
    : null;
  if (!search) redirect("/dashboard/saved");

  await prisma.savedSearch.update({ where: { id: search.id }, data: { lastCheckedAt: new Date() } });
  revalidatePath("/dashboard", "layout");
  redirect(searchHref(toSearchFilters(search.filters as Record<string, string>)));
}
