"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function IncomeExpenseLines({ data }: { data: Array<{ date: string; income: number; expense: number }> }) {
  const rows = (data || []).map((d) => ({
    date: d.date,
    income: d.income ?? 0,
    expense: d.expense ?? 0,
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
          <Line type="monotone" dataKey="income" stroke="#10b981" dot={false} name="Ingresos" />
          <Line type="monotone" dataKey="expense" stroke="#ef4444" dot={false} name="Egresos" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


