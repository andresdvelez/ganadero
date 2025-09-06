"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function MilkChart({ data }: { data: Array<{ date: string; liters?: number }> }) {
  const rows = (data || []).map((d) => ({ date: d.date, liters: d.liters ?? 0 }));
  if (rows.length === 0) {
    return (
      <div className="h-72 grid place-items-center text-sm text-neutral-500">
        <div className="text-center">
          <div className="mb-2">Aún no hay datos de leche.</div>
          <a href="/_/milk/new" className="underline text-primary-600">Registrar ordeño</a>
        </div>
      </div>
    );
  }
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="liters" fill="#06b6d4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


