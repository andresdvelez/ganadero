"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db } from "@/lib/dexie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    db.tasks
      .toArray()
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tareas</h1>
          <Link href="/tasks/new">
            <Button>Crear tarea</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lista de tareas</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-sm text-neutral-500">No hay tareas.</div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li
                    key={t.uuid}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-neutral-500">{t.status}</div>
                    </div>
                    {t.dueDate && (
                      <div className="text-xs text-neutral-500">
                        vence: {new Date(t.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
