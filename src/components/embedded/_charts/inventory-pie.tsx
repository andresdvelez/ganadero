"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#06b6d4"]; 

export default function InventoryPie({ data }: { data: Array<{ name: string; value: number }> }) {
  const rows = (data || []).map((d) => ({ name: d.name, value: d.value }));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {rows.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


