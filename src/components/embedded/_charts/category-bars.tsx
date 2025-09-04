"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function CategoryBars({ data }: { data: Array<{ label: string; income?: number; expense?: number; margin?: number }> }) {
  const rows = (data || []).map((d) => ({
    label: d.label,
    income: d.income ?? 0,
    expense: d.expense ?? 0,
    margin: d.margin ?? (d.income ?? 0) - (d.expense ?? 0),
  }));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="income" fill="#22c55e" name="Ingresos" />
          <Bar dataKey="expense" fill="#ef4444" name="Egresos" />
          <Bar dataKey="margin" fill="#3b82f6" name="Margen" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


