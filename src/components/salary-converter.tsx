"use client";

import { useState } from "react";

export function SalaryConverter({ perTnd }: { perTnd: Record<string, number> }) {
  const codes = Object.keys(perTnd).sort();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(codes.includes("EUR") ? "EUR" : codes[0] ?? "TND");
  const [period, setPeriod] = useState<"MONTH" | "YEAR">("YEAR");

  if (codes.length === 0) return <p className="text-sm">Exchange rates are not available yet.</p>;

  const value = Number(amount);
  const rate = perTnd[currency];
  const monthly = value > 0 && rate ? (period === "YEAR" ? value / 12 : value) / rate : null;
  const input = "rounded border p-2 text-sm";
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="number"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className={`${input} w-32`}
      />
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={input}>
        {codes.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={period} onChange={(e) => setPeriod(e.target.value as "MONTH" | "YEAR")} className={input}>
        <option value="YEAR">per year</option>
        <option value="MONTH">per month</option>
      </select>
      <p className="text-sm font-medium">
        {monthly !== null
          ? `= ${fmt(monthly)} TND / month (${fmt(monthly * 12)} TND / year)`
          : "Enter an amount"}
      </p>
    </div>
  );
}