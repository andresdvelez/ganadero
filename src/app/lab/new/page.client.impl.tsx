"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";

export default function LabNewClient() {
  const [form, setForm] = useState({
    animalId: "",
    examType: "mastitis",
    sampleType: "leche",
    requestedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const uuid = generateUUID();
    const item: any = {
      uuid,
      userId: "local",
      animalId: form.animalId || undefined,
      examType: form.examType,
      sampleType: form.sampleType || undefined,
      requestedAt: new Date(form.requestedAt),
      notes: form.notes || undefined,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.labExams.add(item);
    await addToSyncQueue("create", "lab_exam", uuid, item, "local");
    setSaving(false);
    history.back();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Nuevo examen de laboratorio</h1>
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
          <label className="block text-sm text-neutral-600" htmlFor="examType">
            Tipo de examen
          </label>
          <select
            id="examType"
            className="w-full border rounded-lg px-3 py-2"
            value={form.examType}
            onChange={(e) => setForm({ ...form, examType: e.target.value })}
          >
            <option value="mastitis">Mastitis</option>
            <option value="bromatologico">Bromatológico</option>
            <option value="suelo">Suelo</option>
            <option value="sangre">Sangre</option>
          </select>
          <label
            className="block text-sm text-neutral-600"
            htmlFor="sampleType"
          >
            Tipo de muestra
          </label>
          <input
            id="sampleType"
            className="w-full border rounded-lg px-3 py-2"
            value={form.sampleType}
            onChange={(e) => setForm({ ...form, sampleType: e.target.value })}
          />
          <label
            className="block text-sm text-neutral-600"
            htmlFor="requestedAt"
          >
            Fecha de solicitud
          </label>
          <input
            id="requestedAt"
            type="date"
            className="w-full border rounded-lg px-3 py-2"
            value={form.requestedAt}
            onChange={(e) => setForm({ ...form, requestedAt: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="notes">
            Notas
          </label>
          <input
            id="notes"
            className="w-full border rounded-lg px-3 py-2"
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
