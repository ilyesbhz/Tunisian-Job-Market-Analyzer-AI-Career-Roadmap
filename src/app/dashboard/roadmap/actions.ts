"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AiUnavailableError } from "@/lib/ai/errors";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getFilterOptions } from "@/lib/jobs";
import { generateRoadmapPlan } from "@/lib/roadmap/generate";
import { computeMarketFacts } from "@/lib/roadmap/market";
import { roadmapInputSchema } from "@/lib/roadmap/schema";

const DAILY_LIMIT = 10;

export type RoadmapFormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

export async function createRoadmap(_prev: RoadmapFormState, formData: FormData): Promise<RoadmapFormState> {
  const user = await getCurrentUser();

  const parsed = roadmapInputSchema.safeParse({
    status: formData.get("status"),
    targetRole: formData.get("targetRole"),
    country: formData.get("country"),
    skills: formData.get("skills") ?? "",
    goal: formData.get("goal") ?? "",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const input = parsed.data;

  const { countries } = await getFilterOptions();
  if (!countries.includes(input.country)) return { errors: { country: ["Choose a country from the list"] } };

  const recent = await prisma.roadmap.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent >= DAILY_LIMIT) {
    return { message: `You can create up to ${DAILY_LIMIT} roadmaps a day. Try again tomorrow.` };
  }

  let id: number;
  try {
    const market = await computeMarketFacts(input);
    const { plan, model } = await generateRoadmapPlan(input, market);
    const saved = await prisma.roadmap.create({
      data: { userId: user.id, targetRole: input.targetRole, input, market, plan, model },
      select: { id: true },
    });
    id = saved.id;
  } catch (e) {
    if (e instanceof AiUnavailableError) return { message: e.message };
    throw e;
  }

  revalidatePath("/dashboard/roadmap");
  redirect(`/dashboard/roadmap/${id}`); // keep redirect() outside try/catch
}

export async function deleteRoadmap(formData: FormData) {
  const user = await getCurrentUser();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    // deleteMany scoped to the user, so nobody can delete someone else's roadmap
    await prisma.roadmap.deleteMany({ where: { id, userId: user.id } });
  }
  revalidatePath("/dashboard/roadmap");
  redirect("/dashboard/roadmap");
}
