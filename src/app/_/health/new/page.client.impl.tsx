"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";

export default function HealthNewClient() {
  const [form, setForm] = useState({
    animalId: "",
    type: "vacuna",
    description: "",
    performedAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const uuid = generateUUID();
    const item = {
      uuid,
      userId: "local",
      animalId: form.animalId,
      type: form.type,
      description: form.description,
      performedAt: new Date(form.performedAt),
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await db.healthRecords.add(item);
    await addToSyncQueue("create", "health_record", uuid, item, "local");
    setSaving(false);
    history.back();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Nuevo registro de salud</h1>
        <div className="island p-4 space-y-3">
          <label className="block text-sm text-neutral-600" htmlFor="animalId">
            ID del animal (opcional)
          </label>
          <input
            id="animalId"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Ej: a1b2c3..."
            value={form.animalId}
            onChange={(e) => setForm({ ...form, animalId: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="type">
            Tipo de evento
          </label>
          <select
            id="type"
            className="w-full border rounded-lg px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="vacuna">Vacuna</option>
            <option value="desparasitación">Desparasitación</option>
            <option value="tratamiento">Tratamiento</option>
            <option value="chequeo">Chequeo</option>
          </select>
          <label className="block text-sm text-neutral-600" htmlFor="description">
            Descripción
          </label>
          <input
            id="description"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Detalle del evento"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="performedAt">
            Fecha de realización
          </label>
          <input
            id="performedAt"
            type="date"
            className="w-full border rounded-lg px-3 py-2"
            value={form.performedAt}
            onChange={(e) => setForm({ ...form, performedAt: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <button className="px-4 py-2 rounded-lg bg-neutral-100" onClick={() => history.back()}>
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary-purple text-white"
              onClick={onSave}
              disabled={saving}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
