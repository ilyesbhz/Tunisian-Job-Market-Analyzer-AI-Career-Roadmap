import { prisma } from "@/lib/db";

type SalaryPeriod = "MONTH" | "YEAR";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000;
let lastAttempt = 0;

type ExchangeRateDelegate = {
  findFirst(args: {
    orderBy: { updatedAt: "desc" };
    select: { updatedAt: true };
  }): Promise<{ updatedAt: Date } | null>;
  findMany(): Promise<Array<{ currency: string; perTnd: number; updatedAt: Date }>>;
  upsert(args: {
    where: { currency: string };
    update: { perTnd: number };
    create: { currency: string; perTnd: number };
  }): Promise<unknown>;
};

const exchangeRate = (prisma as unknown as { exchangeRate: ExchangeRateDelegate }).exchangeRate;

// Refreshes the rates at most once a day (and retries at most hourly on failure)
async function ensureRates() {
  const latest = await exchangeRate.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  if (latest && Date.now() - latest.updatedAt.getTime() < MAX_AGE_MS) return;
  if (Date.now() - lastAttempt < RETRY_MS) return;
  lastAttempt = Date.now();

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/TND", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.result !== "success" || typeof data.rates !== "object") return;

    const used = await prisma.jobOffer.findMany({
      where: { currency: { not: null } },
      distinct: ["currency"],
      select: { currency: true },
    });
    const codes = new Set(["TND", ...used.map((u) => u.currency as string)]);

    for (const code of codes) {
      const perTnd = code === "TND" ? 1 : Number(data.rates[code]);
      if (!perTnd || perTnd <= 0) continue;
      await exchangeRate.upsert({
        where: { currency: code },
        update: { perTnd },
        create: { currency: code, perTnd },
      });
    }
  } catch {
    // keep the old rates if the API is unreachable
  }
}

export async function getRates() {
  await ensureRates();
  const rows = await exchangeRate.findMany();
  const perTnd: Record<string, number> = {};
  let updatedAt: Date | null = null;
  for (const r of rows) {
    perTnd[r.currency] = r.perTnd;
    if (!updatedAt || r.updatedAt > updatedAt) updatedAt = r.updatedAt;
  }
  return { perTnd, updatedAt };
}

// Any salary -> TND per month. Returns null when currency, period or rate is unknown.
export function toMonthlyTnd(
  amount: number,
  currency: string | null,
  period: SalaryPeriod | null,
  perTnd: Record<string, number>
): number | null {
  if (!currency || !period) return null;
  const rate = perTnd[currency];
  if (!rate) return null;
  return Math.round(amount / (period === "YEAR" ? 12 : 1) * rate);
}