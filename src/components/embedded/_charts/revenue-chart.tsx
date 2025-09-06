"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";

export default function RevenueChart({ data }: { data: Array<{ date: string; income?: number; expense?: number }> }) {
  const rows = (data || []).map((d) => ({
    date: d.date,
    income: d.income ?? 0,
    expense: d.expense ?? 0,
    margin: (d.income ?? 0) - (d.expense ?? 0),
  }));
  if (rows.length === 0) {
    return (
      <div className="h-60 grid place-items-center text-sm text-neutral-500">
        <div className="text-center">
          <div className="mb-2">Aún no hay datos para mostrar.</div>
          <a href="/finance/new" className="underline text-primary-600">Registrar ingresos/egresos</a>
        </div>
      </div>
    );
  }
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="revA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="margin" stroke="#16a34a" fillOpacity={1} fill="url(#revA)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


