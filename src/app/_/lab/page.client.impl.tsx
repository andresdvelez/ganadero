"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";

export default function LabClient() {
  const [exams, setExams] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const list = await db.labExams.orderBy("requestedAt").reverse().toArray();
      setExams(list);
    })();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setQ(qp);
  }, [params]);

  const filtered = exams.filter((e) => {
    const req = new Date(e.requestedAt).toLocaleDateString();
    const res = e.resultAt ? new Date(e.resultAt).toLocaleDateString() : "";
    return [e.examType, e.sampleType, req, res].some((v: string) =>
      v?.toLowerCase().includes(q.toLowerCase())
    );
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Laboratorio</h1>
          <input
            className="px-3 py-2 border rounded-lg"
            placeholder="Buscar examen, fecha o muestra..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-neutral-600">Sin exámenes.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((e) => (
              <li key={e.uuid} className="island p-3">
                <div className="text-sm text-neutral-500">{e.examType}</div>
                <div className="font-medium">
                  Solicitado: {new Date(e.requestedAt).toLocaleDateString()}
                </div>
                {e.resultAt ? (
                  <div className="text-sm">
                    Resultado: {new Date(e.resultAt).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">Pendiente</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
