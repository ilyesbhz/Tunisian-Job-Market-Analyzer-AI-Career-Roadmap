"use client";

import { useState } from "react";

import { SalaryComparison } from "@/components/salary-comparison";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COUNTRY_INFO, LOCAL_COUNTRY } from "@/lib/config";
import type { PppFactors } from "@/lib/ppp";

type Period = "MONTH" | "YEAR";
type Mode = "convert" | "compare";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function SalaryConverter({
  perTnd,
  ppp,
  localAvg,
}: {
  perTnd: Record<string, number>;
  ppp: PppFactors;
  localAvg: number | null;
}) {
  const codes = Object.keys(perTnd).sort();
  const countries = Object.entries(COUNTRY_INFO).filter(
    ([name, info]) => name !== LOCAL_COUNTRY && perTnd[info.currency],
  );

  const [mode, setMode] = useState<Mode>("convert");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(codes.includes("EUR") ? "EUR" : (codes[0] ?? "TND"));
  const [country, setCountry] = useState(countries[0]?.[0] ?? "");
  const [period, setPeriod] = useState<Period>("YEAR");

  if (codes.length === 0) return <p className="text-muted-foreground text-sm">Exchange rates are not available yet.</p>;

  const value = Number(amount);
  const activeCurrency = mode === "compare" ? (COUNTRY_INFO[country]?.currency ?? currency) : currency;
  const rate = perTnd[activeCurrency];
  // Salary per month, still in the foreign currency
  const monthlyLocal = value > 0 ? (period === "YEAR" ? value / 12 : value) : null;
  const monthlyTnd = monthlyLocal !== null && rate ? monthlyLocal / rate : null;


  const periodSelect = (
    <NativeSelect value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Period">
      <NativeSelectOption value="YEAR">per year</NativeSelectOption>
      <NativeSelectOption value="MONTH">per month</NativeSelectOption>
    </NativeSelect>
  );

  const amountInput = (
    <Input
      type="number"
      min="0"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      placeholder="Amount"
      aria-label="Amount"
      className="w-32"
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={mode}
        onValueChange={(v) => v && setMode(v as Mode)}
        className="w-fit"
      >
        <ToggleGroupItem value="convert">Convert</ToggleGroupItem>
        <ToggleGroupItem value="compare" disabled={countries.length === 0}>
          Compare to {LOCAL_COUNTRY}
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "convert" ? (
        <div className="flex flex-wrap items-center gap-3">
          {amountInput}
          <NativeSelect value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
            {codes.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {periodSelect}
          <p className="text-sm font-medium tabular-nums">
            {monthlyTnd !== null ? (
              `= ${fmt(monthlyTnd)} TND / month (${fmt(monthlyTnd * 12)} TND / year)`
            ) : (
              <span className="text-muted-foreground font-normal">Enter an amount</span>
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {amountInput}
            <span className="text-muted-foreground text-sm">{activeCurrency}</span>
            {periodSelect}
            <span className="text-muted-foreground text-sm">in</span>
            <NativeSelect value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
              {countries.map(([name]) => (
                <NativeSelectOption key={name} value={name}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {monthlyTnd === null ? (
            <p className="text-muted-foreground text-sm">Enter a salary to compare it with {LOCAL_COUNTRY}.</p>
          ) : (
            <SalaryComparison
              monthlyMin={monthlyLocal as number}
              currency={activeCurrency}
              country={country}
              perTnd={perTnd}
              ppp={ppp}
              localAvg={localAvg}
            />
          )}
        </div>
      )}
    </div>
  );
}
