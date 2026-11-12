"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function HBarChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-sm">No data.</p>;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)}
          />
          <Tooltip />
          <Bar dataKey="value" fill="#2E5C8A" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}