"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  value: { label: "Value", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function HBarChart({ data, label = "Offers" }: { data: { name: string; value: number }[]; label?: string }) {
  if (data.length === 0) return <p className="text-muted-foreground text-sm">No data.</p>;

  return (
    <ChartContainer config={{ value: { ...chartConfig.value, label } }} className="aspect-auto h-72 w-full">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const bracketConfig = {
  stated: { label: "Stated in the offer", color: "var(--chart-4)" },
  estimated: { label: "Estimated by the model", color: "var(--chart-2)" },
} satisfies ChartConfig;

type BracketDatum = { name: string; stated: number; estimated: number; statedN: number; estimatedN: number };

// Two distributions side by side (each sums to 100%): never stacked or added up, because estimates
// are a model output and the two groups are different offers.
export function BracketCompareChart({ data }: { data: BracketDatum[] }) {
  return (
    <ChartContainer config={bracketConfig} className="aspect-auto h-72 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value, name, item) => {
                const key = name as keyof typeof bracketConfig;
                const n = key === "stated" ? item.payload.statedN : item.payload.estimatedN;
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{bracketConfig[key].label}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {value}% <span className="text-muted-foreground font-normal">({n} offers)</span>
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="stated" fill="var(--color-stated)" radius={4} />
        <Bar dataKey="estimated" fill="var(--color-estimated)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
