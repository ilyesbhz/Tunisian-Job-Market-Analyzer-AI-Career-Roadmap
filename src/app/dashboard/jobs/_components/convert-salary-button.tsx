"use client";

import { ArrowRightLeft } from "lucide-react";

import { SalaryComparison } from "@/components/salary-comparison";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { LOCAL_COUNTRY } from "@/lib/config";
import type { PppFactors } from "@/lib/ppp";

export function ConvertSalaryButton({
  title,
  country,
  currency,
  salaryMin,
  salaryMax,
  period,
  perTnd,
  ppp,
  localAvg,
}: {
  title: string;
  country: string;
  currency: string;
  salaryMin: number;
  salaryMax: number;
  period: "MONTH" | "YEAR";
  perTnd: Record<string, number>;
  ppp: PppFactors;
  localAvg: number | null;
}) {
  const perMonth = (v: number) => (period === "YEAR" ? v / 12 : v);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" aria-label={`Compare the salary of ${title} to ${LOCAL_COUNTRY}`}>
          <ArrowRightLeft />
          Convert
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader className="mb-3">
          <PopoverTitle>Compare to {LOCAL_COUNTRY}</PopoverTitle>
          <PopoverDescription className="line-clamp-2">
            {title} · {country}
          </PopoverDescription>
        </PopoverHeader>
        <SalaryComparison
          compact
          monthlyMin={perMonth(salaryMin)}
          monthlyMax={perMonth(salaryMax)}
          currency={currency}
          country={country}
          perTnd={perTnd}
          ppp={ppp}
          localAvg={localAvg}
        />
      </PopoverContent>
    </Popover>
  );
}
