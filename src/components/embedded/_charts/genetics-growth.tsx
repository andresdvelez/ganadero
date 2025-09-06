"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type GeneticPoint = { date: string; adg?: number; epdIndex?: number };

export default function GeneticsGrowth({ data }: { data: GeneticPoint[] }) {
  const rows = (data || []).map((d) => ({ date: d.date, adg: d.adg ?? 0, epdIndex: d.epdIndex ?? 0 }));
  if (rows.length === 0) {
    return (
      <div className="h-60 grid place-items-center text-sm text-neutral-500">
        <div className="text-center">
          <div className="mb-2">Aún no hay registros de pesos.</div>
          <a href="/_/weights" className="underline text-primary-600">Registrar peso</a>
        </div>
      </div>
    );
  }
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="adgA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="adg" stroke="#0284c7" fillOpacity={1} fill="url(#adgA)" name="ADG (kg/día)" />
          <Area type="monotone" dataKey="epdIndex" stroke="#8b5cf6" fillOpacity={0.25} fill="#8b5cf6" name="Índice EPD" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


