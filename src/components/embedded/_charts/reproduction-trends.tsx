"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type ReproPoint = { date: string; pregnancyRate?: number; calvingIntervalDays?: number };

export default function ReproductionTrends({ data }: { data: ReproPoint[] }) {
  const rows = (data || []).map((d) => ({
    date: d.date,
    pregnancyRate: d.pregnancyRate ?? 0,
    calvingIntervalDays: d.calvingIntervalDays ?? 0,
  }));
  if (rows.length === 0) {
    return (
      <div className="h-60 grid place-items-center text-sm text-neutral-500">
        <div className="text-center">
          <div className="mb-2">Aún no hay datos de reproducción.</div>
          <a href="/_/breeding/new" className="underline text-primary-600">Registrar evento reproductivo</a>
        </div>
      </div>
    );
  }
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pregnancyRate" stroke="#16a34a" dot={false} name="Tasa preñez (%)" />
          <Line type="monotone" dataKey="calvingIntervalDays" stroke="#f59e0b" dot={false} name="IEP (días)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


