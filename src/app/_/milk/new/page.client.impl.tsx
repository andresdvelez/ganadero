"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";

export default function MilkNewClient() {
  const [form, setForm] = useState({
    animalId: "",
    session: "AM",
    liters: "",
    recordedAt: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const uuid = generateUUID();
    const item: any = {
      uuid,
      userId: "local",
      animalId: form.animalId || undefined,
      session: form.session,
      liters: Number(form.liters || 0),
      recordedAt: new Date(form.recordedAt),
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.milkRecords.add(item);
    await addToSyncQueue("create", "milk_record", uuid, item, "local");
    setSaving(false);
    history.back();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Nuevo registro de leche</h1>
        <div className="island p-4 space-y-3">
          <label className="block text-sm text-neutral-600" htmlFor="animalId">
            ID del animal (opcional)
          </label>
          <input
            id="animalId"
            className="w-full border rounded-lg px-3 py-2"
            value={form.animalId}
            onChange={(e) => setForm({ ...form, animalId: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="session">
            Jornada
          </label>
          <select
            id="session"
            className="w-full border rounded-lg px-3 py-2"
            value={form.session}
            onChange={(e) => setForm({ ...form, session: e.target.value })}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="TOTAL">Total</option>
          </select>
          <label className="block text-sm text-neutral-600" htmlFor="liters">
            Litros
          </label>
          <input
            id="liters"
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })}
          />
          <label
            className="block text-sm text-neutral-600"
            htmlFor="recordedAt"
          >
            Fecha y hora
          </label>
          <input
            id="recordedAt"
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2"
            value={form.recordedAt}
            onChange={(e) => setForm({ ...form, recordedAt: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 rounded-lg bg-neutral-100"
              onClick={() => history.back()}
            >
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
