"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type PasturePoint = { pasture: string; occupancy?: number };

export default function PastureOccupancy({ data }: { data: PasturePoint[] }) {
  const rows = (data || []).map((d) => ({ pasture: d.pasture, occupancy: d.occupancy ?? 0 }));
  if (rows.length === 0) {
    return (
      <div className="h-60 grid place-items-center text-sm text-neutral-500">
        <div className="text-center">
          <div className="mb-2">Aún no hay eventos en potreros.</div>
          <a href="/_/pastures" className="underline text-primary-600">Registrar evento o potrero</a>
        </div>
      </div>
    );
  }
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


