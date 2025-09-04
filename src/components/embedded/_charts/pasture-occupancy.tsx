"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type PasturePoint = { pasture: string; occupancy?: number };

export default function PastureOccupancy({ data }: { data: PasturePoint[] }) {
  const rows = (data || []).map((d) => ({ pasture: d.pasture, occupancy: d.occupancy ?? 0 }));
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="pasture" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="occupancy" fill="#f97316" name="Ocupación (%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


