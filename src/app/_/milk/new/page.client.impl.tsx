"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
          <Input
            id="animalId"
            className="w-full"
            value={form.animalId}
            onChange={(e) => setForm({ ...form, animalId: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="session">
            Jornada
          </label>
          <Select
            id="session"
            value={form.session}
            onChange={(e) => setForm({ ...form, session: e.target.value })}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="TOTAL">Total</option>
          </Select>
          <label className="block text-sm text-neutral-600" htmlFor="liters">
            Litros
          </label>
          <Input
            id="liters"
            type="number"
            className="w-full"
            value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })}
          />
          <label
            className="block text-sm text-neutral-600"
            htmlFor="recordedAt"
          >
            Fecha y hora
          </label>
          <Input
            id="recordedAt"
            type="datetime-local"
            className="w-full"
            value={form.recordedAt}
            onChange={(e) => setForm({ ...form, recordedAt: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="flat" onPress={() => history.back()}>
              Cancelar
            </Button>
            <Button color="primary" onPress={onSave} isDisabled={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
