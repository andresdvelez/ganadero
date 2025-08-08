"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";

export default function BreedingNewClient() {
  const [form, setForm] = useState({
    animalId: "",
    eventType: "insemination",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const uuid = generateUUID();
    const item = {
      uuid,
      userId: "local",
      animalId: form.animalId,
      eventType: form.eventType,
      eventDate: new Date(form.date),
      notes: form.notes,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await db.breedingRecords.add(item);
    await addToSyncQueue("create", "breeding_record", uuid, item, "local");
    setSaving(false);
    history.back();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Nuevo evento de reproducción</h1>
        <div className="island p-4 space-y-3">
          <label className="block text-sm text-neutral-600" htmlFor="animalId">
            ID del animal
          </label>
          <input
            id="animalId"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Ej: a1b2c3..."
            value={form.animalId}
            onChange={(e) => setForm({ ...form, animalId: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="eventType">
            Tipo de evento
          </label>
          <select
            id="eventType"
            className="w-full border rounded-lg px-3 py-2"
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
          >
            <option value="heat">Celo</option>
            <option value="insemination">IA/MN</option>
            <option value="pregnancy_check">Palpación</option>
            <option value="birth">Parto</option>
          </select>
          <label className="block text-sm text-neutral-600" htmlFor="date">
            Fecha
          </label>
          <input
            id="date"
            type="date"
            className="w-full border rounded-lg px-3 py-2"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="notes">
            Notas
          </label>
          <input
            id="notes"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Detalle"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
