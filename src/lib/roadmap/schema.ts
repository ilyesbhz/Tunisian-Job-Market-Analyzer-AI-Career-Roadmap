import { z } from "zod";

import type { JobLevelKey } from "@/lib/levels";

// ---------- What the user enters ----------

export const CAREER_STATUSES = {
  STUDENT: { label: "Student", hint: "Still studying, looking for internships" },
  GRADUATE: { label: "Recent graduate", hint: "Looking for a first job" },
  EMPLOYEE: { label: "Employee", hint: "Working, aiming for the next step" },
} as const;

export type CareerStatus = keyof typeof CAREER_STATUSES;

// The offer level that matches each status, to suggest real offers for the next step
export const NEXT_LEVELS: Record<CareerStatus, JobLevelKey[]> = {
  STUDENT: ["INTERNSHIP", "ENTRY"],
  GRADUATE: ["ENTRY"],
  EMPLOYEE: ["EXPERIENCED"],
};

export const roadmapInputSchema = z.object({
  status: z.enum(Object.keys(CAREER_STATUSES) as [CareerStatus, ...CareerStatus[]], {
    message: "Choose where you are now",
  }),
  targetRole: z.string().trim().min(2, "Enter the role you are aiming for").max(80),
  country: z.string().trim().min(1).max(60),
  skills: z
    .string()
    .max(500, "Keep the list under 500 characters")
    .transform((s) =>
      [...new Set(s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 30),
    ),
  goal: z.string().trim().max(300, "Keep it under 300 characters").optional().default(""),
});

export type RoadmapInput = z.infer<typeof roadmapInputSchema>;

// ---------- Facts computed from the job offers (no AI) ----------

export type MarketFacts = {
  matchingOffers: number;
  matchedOn: string; // the words used to match titles
  skillData: boolean; // false when matching offers have no extracted skills (e.g. France/UK)
  topSkills: { name: string; share: number; has: boolean }[]; // share = % of matching offers
  levels: { level: JobLevelKey; count: number }[];
  salaryByLevel: { level: JobLevelKey; avgTnd: number; n: number }[];
  nextOffers: {
    id: number;
    title: string;
    company: string | null;
    location: string;
    level: JobLevelKey | null;
    url: string | null;
    validThrough: string | null;
  }[];
};

// ---------- What the language model must return ----------

export const roadmapPlanSchema = z.object({
  summary: z.string().min(1),
  phases: z
    .array(
      z.object({
        title: z.string().min(1),
        duration: z.string().min(1),
        goal: z.string().min(1),
        skills: z.array(z.string()).default([]),
        actions: z.array(z.string()).default([]),
        milestone: z.string().default(""),
      }),
    )
    .min(2)
    .max(6),
  tips: z.array(z.string()).default([]),
});

export type RoadmapPlan = z.infer<typeof roadmapPlanSchema>;

// Same shape as JSON Schema, passed to the model so its answer is constrained to it
export const ROADMAP_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    phases: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          duration: { type: "string" },
          goal: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
          actions: { type: "array", items: { type: "string" } },
          milestone: { type: "string" },
        },
        required: ["title", "duration", "goal", "skills", "actions", "milestone"],
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "phases", "tips"],
} as const;
