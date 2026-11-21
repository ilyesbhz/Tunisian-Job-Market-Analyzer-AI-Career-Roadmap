import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Offers missing from the latest import are marked inactive (not deleted, so favorites survive).
// Safety net: skip that step when the file looks broken, so a bad export can't hide every offer.
const MAX_INVALID_SHARE = 0.1;

const recordSchema = z.object({
  source: z.object({
    name: z.string().min(1),
    type: z.enum(["SCRAPING", "API"]),
    country: z.string().min(1),
  }),
  externalId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().nullish(),
  country: z.string().min(1),
  city: z.string().nullish(),
  sector: z.string().nullish(),
  skills: z.array(z.string()).default([]),
  salaryMin: z.number().int().nonnegative().nullish(),
  salaryMax: z.number().int().nonnegative().nullish(),
  currency: z.string().length(3).nullish(),
  postedAt: z.string().nullish(),
  validThrough: z.string().nullish(),
  level: z.enum(["INTERNSHIP", "ENTRY", "EXPERIENCED"]).nullish(),
  url: z.string().url().nullish(),
  salaryPeriod: z.enum(["MONTH", "YEAR"]).nullish(),
  // salary-bracket model estimate, only for offers that state no salary (see export_jobs.py)
  estimatedSalaryBracket: z.enum(["<1000", "1000-1500", "1500-2000", ">=2000"]).nullish(),
  estimatedSalaryMin: z.number().int().nonnegative().nullish(),
  estimatedSalaryMax: z.number().int().nonnegative().nullish(),
  estimatedSalaryCurrency: z.string().length(3).nullish(),
  estimatedSalaryConfidence: z.number().min(0).max(1).nullish(),
});

async function main() {
  const file = path.resolve(process.argv[2] ?? "data/jobs.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!Array.isArray(raw)) throw new Error("The file must contain a JSON array");

  const runStart = new Date();
  const sourceIds = new Map<string, number>();
  let processed = 0;
  let skipped = 0;

  for (const [i, item] of raw.entries()) {
    const parsed = recordSchema.safeParse(item);
    if (!parsed.success) {
      skipped++;
      if (skipped <= 5) {
        console.warn(`Record ${i} skipped:`, parsed.error.flatten().fieldErrors);
      }
      continue;
    }
    const r = parsed.data;

    let sourceId = sourceIds.get(r.source.name);
    if (sourceId === undefined) {
      const source = await prisma.source.upsert({
        where: { name: r.source.name },
        update: { type: r.source.type, country: r.source.country },
        create: r.source,
      });
      sourceId = source.id;
      sourceIds.set(r.source.name, sourceId);
    }

    const postedAt = r.postedAt ? new Date(r.postedAt) : null;
    const validThrough = r.validThrough ? new Date(r.validThrough) : null;
    const data = {
      title: r.title,
      company: r.company ?? null,
      country: r.country,
      city: r.city ?? null,
      sector: r.sector ?? null,
      skills: r.skills,
      salaryMin: r.salaryMin ?? null,
      salaryMax: r.salaryMax ?? null,
      currency: r.currency ?? null,
      postedAt: postedAt && !isNaN(postedAt.getTime()) ? postedAt : null,
      validThrough: validThrough && !isNaN(validThrough.getTime()) ? validThrough : null,
      level: r.level ?? null,
      url: r.url ?? null,
      // export_jobs.py normalizes every salary to a yearly amount.
      salaryPeriod: r.salaryPeriod ?? "YEAR",
      // written on every import so an offer that now states its salary loses its old estimate
      estimatedSalaryBracket: r.estimatedSalaryBracket ?? null,
      estimatedSalaryMin: r.estimatedSalaryMin ?? null,
      estimatedSalaryMax: r.estimatedSalaryMax ?? null,
      estimatedSalaryCurrency: r.estimatedSalaryCurrency ?? null,
      estimatedSalaryConfidence: r.estimatedSalaryConfidence ?? null,
      isActive: true,
      lastImportedAt: runStart,
    };

    await prisma.jobOffer.upsert({
      where: { sourceId_externalId: { sourceId, externalId: r.externalId } },
      update: data,
      create: { ...data, sourceId, externalId: r.externalId },
    });
    processed++;
  }

  // Deactivate the offers of these sources that this run did not contain
  let deactivated = 0;
  if (processed === 0 || skipped / raw.length > MAX_INVALID_SHARE) {
    console.warn("Too many invalid records: offers missing from this file were NOT marked inactive.");
  } else {
    const result = await prisma.jobOffer.updateMany({
      where: {
        sourceId: { in: [...sourceIds.values()] },
        isActive: true,
        OR: [{ lastImportedAt: null }, { lastImportedAt: { lt: runStart } }],
      },
      data: { isActive: false },
    });
    deactivated = result.count;
  }

  const [total, active] = await Promise.all([
    prisma.jobOffer.count(),
    prisma.jobOffer.count({ where: { isActive: true } }),
  ]);
  console.log(
    `Processed: ${processed}, skipped (invalid): ${skipped}, marked inactive: ${deactivated}, ` +
      `active offers: ${active} of ${total} in database`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());