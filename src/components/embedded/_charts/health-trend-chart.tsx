"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function HealthTrendChart({ data }: { data: Array<{ date: string; cases?: number; recoveries?: number }> }) {
  const rows = (data || []).map((d) => ({
    date: d.date,
    cases: d.cases ?? 0,
    recoveries: d.recoveries ?? 0,
  }));
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cases" stroke="#ef4444" dot={false} />
          <Line type="monotone" dataKey="recoveries" stroke="#3b82f6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


