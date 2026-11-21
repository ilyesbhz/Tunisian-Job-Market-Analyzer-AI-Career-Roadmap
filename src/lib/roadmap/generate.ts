import "server-only";

import { AiUnavailableError, getAiProvider } from "@/lib/ai/provider";
import { JOB_LEVELS } from "@/lib/levels";

import {
  CAREER_STATUSES,
  type MarketFacts,
  ROADMAP_PLAN_JSON_SCHEMA,
  type RoadmapInput,
  type RoadmapPlan,
  roadmapPlanSchema,
} from "./schema";

const SYSTEM = `You are a practical career advisor for students, recent graduates and employees,
with a focus on the Tunisian job market and on opportunities abroad.
Write a step-by-step career roadmap for the person described.
Rules:
- Base the plan on the MARKET DATA given: prioritise the skills that offers ask for most and that the person does not have yet.
- Never invent statistics, salaries or company names. Only quote numbers that appear in the MARKET DATA.
- Be concrete: name real skills, tools, certifications, project ideas and the kind of offer to apply for.
- Fit the person's current situation: a student starts with internships, a graduate with a first job, an employee with the next level.
- Give 3 to 5 phases in order, each with a realistic duration (for example "0-3 months").
- Keep each action short (one sentence). Write in English.`;

function describeMarket(input: RoadmapInput, m: MarketFacts): string {
  if (m.matchingOffers === 0) {
    return `No offers in ${input.country} match "${input.targetRole}" in our database. Use general knowledge of this role, and say the plan is not based on local offers.`;
  }
  const lines = [`${m.matchingOffers} offers in ${input.country} match "${input.targetRole}".`];
  if (m.skillData && m.topSkills.length) {
    lines.push(
      "Most requested skills (share of matching offers):",
      ...m.topSkills.map((s) => `- ${s.name}: ${s.share}%${s.has ? " (the person already has it)" : ""}`),
    );
  } else {
    lines.push("No skill data is available for these offers: use general knowledge of the role for skills.");
  }
  const levels = m.levels.filter((l) => l.count > 0);
  if (levels.length) {
    lines.push(`Offers by level: ${levels.map((l) => `${JOB_LEVELS[l.level].label} ${l.count}`).join(", ")}.`);
  }
  if (m.salaryByLevel.length) {
    lines.push(
      `Average salary (TND per month, converted): ${m.salaryByLevel
        .map((s) => `${JOB_LEVELS[s.level].label} ${s.avgTnd.toLocaleString("en-US")} (${s.n} offers)`)
        .join(", ")}.`,
    );
  }
  return lines.join("\n");
}

export async function generateRoadmapPlan(
  input: RoadmapInput,
  market: MarketFacts,
): Promise<{ plan: RoadmapPlan; model: string }> {
  const provider = getAiProvider();
  const status = CAREER_STATUSES[input.status];

  const prompt = `PERSON
- Situation: ${status.label} (${status.hint.toLowerCase()})
- Target role: ${input.targetRole}
- Country of interest: ${input.country}
- Current skills: ${input.skills.length ? input.skills.join(", ") : "none given"}
${input.goal ? `- Goal in their words: ${input.goal}` : ""}

MARKET DATA
${describeMarket(input, market)}

Write the roadmap as JSON with: summary (2-3 sentences), phases (title, duration, goal, skills to learn, actions, milestone), tips (2-4 short tips).`;

  // Small local models occasionally return an off-shape answer: retry once before giving up
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await provider.generateJson({ system: SYSTEM, prompt, schema: ROADMAP_PLAN_JSON_SCHEMA });
    const parsed = roadmapPlanSchema.safeParse(raw);
    if (parsed.success) {
      const plan = parsed.data;
      return {
        model: provider.id,
        plan: {
          summary: plan.summary.trim(),
          phases: plan.phases.slice(0, 5).map((p) => ({
            ...p,
            skills: p.skills.map((s) => s.trim()).filter(Boolean).slice(0, 8),
            actions: p.actions.map((a) => a.trim()).filter(Boolean).slice(0, 6),
          })),
          tips: plan.tips.map((t) => t.trim()).filter(Boolean).slice(0, 4),
        },
      };
    }
  }
  throw new AiUnavailableError("The AI model did not return a usable roadmap. Please try again.");
}
