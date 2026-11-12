import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

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
  url: z.string().url().nullish(),
  salaryPeriod: z.enum(["MONTH", "YEAR"]).nullish(),
});

async function main() {
  const file = path.resolve(process.argv[2] ?? "data/jobs.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!Array.isArray(raw)) throw new Error("The file must contain a JSON array");

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
      url: r.url ?? null,
      // export_jobs.py normalizes every salary to a yearly amount.
      salaryPeriod: r.salaryPeriod ?? "YEAR",
    };

    await prisma.jobOffer.upsert({
      where: { sourceId_externalId: { sourceId, externalId: r.externalId } },
      update: data,
      create: { ...data, sourceId, externalId: r.externalId },
    });
    processed++;
  }

  const total = await prisma.jobOffer.count();
  console.log(`Processed: ${processed}, skipped (invalid): ${skipped}, offers in database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());