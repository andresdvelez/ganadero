"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";

export default function LabClient() {
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const list = await db.labExams.orderBy("requestedAt").reverse().toArray();
      setExams(list);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Laboratorio</h1>
        {exams.length === 0 ? (
          <p className="text-neutral-600">Sin exámenes.</p>
        ) : (
          <ul className="space-y-2">
            {exams.map((e) => (
              <li key={e.uuid} className="island p-3">
                <div className="text-sm text-neutral-500">{e.examType}</div>
                <div className="font-medium">Solicitado: {new Date(e.requestedAt).toLocaleDateString()}</div>
                {e.resultAt ? (
                  <div className="text-sm">Resultado: {new Date(e.resultAt).toLocaleDateString()}</div>
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