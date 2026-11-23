"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

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
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={24} />
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

// Daily counts as recessive context, with the 7-day average as the one emphasized series.
// Both share one axis (same unit). Identity is carried by mark type + legend, not by hue.
const dailyConfig = {
  newJobs: { label: "New offers that day", color: "color-mix(in oklch, var(--chart-2) 55%, var(--card))" },
  avg7: { label: "7-day average", color: "var(--primary)" },
} satisfies ChartConfig;

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function DailyTrendChart({ data }: { data: { day: string; newJobs: number | null; avg7: number | null }[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-sm">No data.</p>;
  return (
    <ChartContainer config={dailyConfig} className="aspect-auto h-80 w-full">
      <ComposedChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap={1}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tickFormatter={(d: string) => shortDate.format(new Date(d))}
        />
        <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, items) => {
                const day = items?.[0]?.payload?.day as string | undefined;
                return day ? shortDate.format(new Date(day)) : "";
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="newJobs" fill="var(--color-newJobs)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Line
          dataKey="avg7"
          stroke="var(--color-avg7)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  );
}
