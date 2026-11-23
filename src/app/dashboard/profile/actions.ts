"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { z } from "zod";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getFilterOptions } from "@/lib/jobs";
import { CAREER_STATUSES, type CareerStatus } from "@/lib/roadmap/schema";
import { signupSchema } from "@/lib/schemas";

export type ProfileFormState =
  | { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> }
  | undefined;

const accountSchema = signupSchema.pick({ name: true, email: true });

export async function updateAccount(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  const parsed = accountSchema.safeParse({ name: formData.get("name"), email: formData.get("email") });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { email: ["This email is already used by another account"] } };
    }
    throw e;
  }
  revalidatePath("/dashboard", "layout"); // name and email also show in the sidebar and header
  return { ok: true, message: "Account details saved." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: signupSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(parsed.data.currentPassword, row.passwordHash))) {
    return { errors: { currentPassword: ["Your current password is not correct"] } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return { ok: true, message: "Password changed." };
}

const careerSchema = z.object({
  careerStatus: z
    .enum(Object.keys(CAREER_STATUSES) as [CareerStatus, ...CareerStatus[]])
    .optional()
    .catch(undefined),
  targetRole: z.string().trim().max(80, "Keep it under 80 characters"),
  preferredCountry: z.string().trim().max(60),
  skills: z
    .string()
    .max(500, "Keep the list under 500 characters")
    .transform((s) => [...new Set(s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 30)),
});

export async function updateCareerProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  const parsed = careerSchema.safeParse({
    careerStatus: formData.get("careerStatus") || undefined,
    targetRole: formData.get("targetRole") ?? "",
    preferredCountry: formData.get("preferredCountry") ?? "",
    skills: formData.get("skills") ?? "",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const { countries } = await getFilterOptions();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      careerStatus: d.careerStatus ?? null,
      targetRole: d.targetRole || null,
      preferredCountry: countries.includes(d.preferredCountry) ? d.preferredCountry : null,
      skills: d.skills,
    },
  });
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/roadmap");
  return { ok: true, message: "Career profile saved. It will pre-fill your next roadmap." };
}
