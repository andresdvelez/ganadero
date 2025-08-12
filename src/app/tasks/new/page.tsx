"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, generateUUID, addToSyncQueue } from "@/lib/dexie";

export default function TaskNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "done">("open");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<string>("");

  async function handleSave() {
    const uuid = generateUUID();
    const payload = {
      uuid,
      userId: "dev-user",
      title,
      description: description || undefined,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await db.tasks.add(payload);
    await addToSyncQueue("create", "task", uuid, payload, "dev-user");
    router.push("/tasks");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva tarea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm" htmlFor="title">
                  Título
                </label>
                <input
                  id="title"
                  className="w-full border rounded px-3 py-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Revisión de potreros"
                  title="Título de la tarea"
                />
              </div>
              <div>
                <label className="text-sm" htmlFor="status">
                  Estado
                </label>
                <select
                  id="status"
                  className="w-full border rounded px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  title="Estado de la tarea"
                >
                  <option value="open">Abierta</option>
                  <option value="in_progress">En progreso</option>
                  <option value="done">Completada</option>
                </select>
              </div>
              <div>
                <label className="text-sm" htmlFor="priority">
                  Prioridad
                </label>
                <select
                  id="priority"
                  className="w-full border rounded px-3 py-2"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  title="Prioridad"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="text-sm" htmlFor="due">
                  Fecha límite
                </label>
                <input
                  id="due"
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  title="Fecha límite"
                />
              </div>
            </div>
            <div>
              <label className="text-sm" htmlFor="desc">
                Descripción
              </label>
              <textarea
                id="desc"
                className="w-full border rounded px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles de la tarea"
                title="Descripción"
              />
            </div>
            <div className="flex gap-2">
              <Button onPress={handleSave}>Guardar</Button>
              <Button variant="bordered" onPress={() => router.push("/tasks")}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
