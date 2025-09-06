"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#06b6d4"]; 

export default function InventoryPie({ data }: { data: Array<{ name: string; value: number }> }) {
  const rows = (data || []).map((d) => ({ name: d.name, value: d.value }));
  if (rows.length === 0) {
    return (
      <div className="h-72 grid place-items-center text-sm text-neutral-500">
        <div className="text-center">
          <div className="mb-2">Aún no hay movimientos de inventario.</div>
          <a href="/_/inventory/new" className="underline text-primary-600">Crear producto o movimiento</a>
        </div>
      </div>
    );
  }
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


