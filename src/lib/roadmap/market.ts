import "server-only";

import type { Prisma } from "@prisma/client";

import { getRates, toMonthlyTnd } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { openOffers } from "@/lib/jobs";
import { JOB_LEVEL_KEYS, type JobLevelKey } from "@/lib/levels";

import { type MarketFacts, NEXT_LEVELS, type RoadmapInput } from "./schema";

const MIN_SALARY_OFFERS = 3;

const STOPWORDS = new Set([
  "and", "the", "for", "with", "of", "in", "de", "des", "du", "la", "le", "les", "et", "en", "pour", "une", "un",
  "h/f", "f/h", "junior", "senior", "stage", "stagiaire", "intern", "internship",
]);

// English <-> French equivalents for common role words (normalized, no accents)
const SYNONYMS: string[][] = [
  ["developer", "developpeur", "dev", "programmer", "programmeur"],
  ["engineer", "ingenieur", "engineering"],
  ["analyst", "analyste"],
  ["accountant", "comptable", "accounting", "comptabilite"],
  ["sales", "commercial", "commerciale", "vendeur", "vendeuse"],
  ["designer", "design", "graphiste"],
  ["manager", "responsable", "chef", "directeur", "director"],
  ["technician", "technicien", "technicienne"],
  ["nurse", "infirmier", "infirmiere"],
  ["teacher", "enseignant", "enseignante", "professeur", "formateur", "trainer"],
  ["consultant", "consultante"],
  ["data", "donnees"],
  ["marketing", "marketeur"],
  ["software", "logiciel"],
  ["network", "reseau", "reseaux"],
  ["security", "securite", "cybersecurity", "cybersecurite"],
  ["web", "fullstack", "frontend", "backend"],
  ["mobile", "android", "ios", "flutter"],
  ["support", "helpdesk"],
  ["recruiter", "recruteur", "recrutement", "hr", "rh"],
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const tokenize = (s: string) => normalize(s).split(/[^a-z0-9+#]+/).filter(Boolean);

// A query word matches a title word when one is a prefix of the other (plurals, "développeur"/"développeuse"...)
const wordMatches = (query: string, token: string) =>
  token === query || (token.length >= 4 && query.length >= 4 && (token.startsWith(query) || query.startsWith(token)));

function variantsOf(word: string): string[] {
  const group = SYNONYMS.find((g) => g.some((w) => wordMatches(w, word)));
  return group ? [...new Set([word, ...group])] : [word];
}

export async function computeMarketFacts(input: RoadmapInput): Promise<MarketFacts> {
  const queryWords = [...new Set(tokenize(input.targetRole).filter((w) => w.length >= 2 && !STOPWORDS.has(w)))];
  const groups = queryWords.map(variantsOf);

  // 1. Match offer titles in the chosen country (in JS, so accents and synonyms are handled)
  const titles = await prisma.jobOffer.findMany({
    where: { country: input.country, isActive: true },
    select: { id: true, title: true },
  });
  const tokenized = titles.map((t) => ({ id: t.id, tokens: tokenize(t.title) }));
  const matchGroup = (tokens: string[], group: string[]) => group.some((q) => tokens.some((t) => wordMatches(q, t)));

  let matched = groups.length ? tokenized.filter((t) => groups.every((g) => matchGroup(t.tokens, g))) : [];
  let matchedOn = queryWords.join(" + ");
  if (matched.length === 0 && groups.length > 1) {
    // Nothing has every word: accept offers matching any of them (looser, so only as a last resort)
    matched = tokenized.filter((t) => groups.some((g) => matchGroup(t.tokens, g)));
    matchedOn = queryWords.join(" or ");
  }
  const ids = matched.map((m) => m.id);

  const empty: MarketFacts = {
    matchingOffers: 0,
    matchedOn,
    skillData: false,
    topSkills: [],
    levels: [],
    salaryByLevel: [],
    nextOffers: [],
  };
  if (ids.length === 0) return empty;

  // 2. Details of the matching offers
  const where: Prisma.JobOfferWhereInput = { id: { in: ids } };
  const [offers, rates] = await Promise.all([
    prisma.jobOffer.findMany({
      where,
      select: { skills: true, level: true, salaryMin: true, salaryMax: true, currency: true, salaryPeriod: true },
    }),
    getRates(),
  ]);

  // Skills: share of matching offers (that have skill data) asking for each one
  const userSkills = new Set(input.skills.map(normalize));
  const withSkills = offers.filter((o) => o.skills.length > 0);
  const skillCounts = new Map<string, { name: string; n: number }>();
  for (const o of withSkills) {
    for (const s of new Set(o.skills.map((x) => x.trim()))) {
      const key = normalize(s);
      const entry = skillCounts.get(key) ?? { name: s, n: 0 };
      entry.n += 1;
      skillCounts.set(key, entry);
    }
  }
  // A "skill" that is just the role name (e.g. "comptable" for a Comptable) tells the user nothing
  const isRoleWord = (key: string) => groups.some((g) => g.some((q) => tokenize(key).every((t) => wordMatches(q, t))));
  const topSkills = [...skillCounts.entries()]
    .filter(([key]) => !isRoleWord(key))
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 12)
    .map(([key, { name, n }]) => ({ name, share: Math.round((n / withSkills.length) * 100), has: userSkills.has(key) }));

  // Levels and average monthly salary (TND, midpoint of the range) per level
  const levels = JOB_LEVEL_KEYS.map((level) => ({ level, count: offers.filter((o) => o.level === level).length }));
  const salaryByLevel = JOB_LEVEL_KEYS.flatMap((level) => {
    const values = offers
      .filter((o) => o.level === level && o.salaryMin != null)
      .map((o) => toMonthlyTnd(((o.salaryMin as number) + (o.salaryMax ?? (o.salaryMin as number))) / 2, o.currency, o.salaryPeriod, rates.perTnd))
      .filter((v): v is number => v != null);
    // Averages over fewer than 3 offers are too noisy to show or to give to the model
    return values.length >= MIN_SALARY_OFFERS ? [{ level, avgTnd: Math.round(values.reduce((a, b) => a + b, 0) / values.length), n: values.length }] : [];
  });

  // 3. Real, still-open offers for the user's next step
  const nextLevels: JobLevelKey[] = NEXT_LEVELS[input.status];
  const open = openOffers();
  const pick = (levelFilter: Prisma.JobOfferWhereInput) =>
    prisma.jobOffer.findMany({
      where: { AND: [where, open, levelFilter] },
      orderBy: [{ postedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: 5,
      select: { id: true, title: true, company: true, city: true, country: true, level: true, url: true, validThrough: true },
    });
  let next = await pick({ level: { in: nextLevels } });
  if (next.length === 0) next = await pick({});

  return {
    matchingOffers: ids.length,
    matchedOn,
    skillData: withSkills.length > 0,
    topSkills,
    levels,
    salaryByLevel,
    nextOffers: next.map((o) => ({
      id: o.id,
      title: o.title,
      company: o.company,
      location: [o.city, o.country].filter(Boolean).join(", "),
      level: o.level,
      url: o.url,
      validThrough: o.validThrough ? o.validThrough.toISOString().slice(0, 10) : null,
    })),
  };
}
