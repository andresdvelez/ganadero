"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasturesNewClient() {
  const [form, setForm] = useState({
    name: "",
    areaHa: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const uuid = generateUUID();
    const item: any = {
      uuid,
      userId: "local",
      name: form.name,
      areaHa: form.areaHa ? Number(form.areaHa) : undefined,
      notes: form.notes || undefined,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.pastures.add(item);
    await addToSyncQueue("create", "pasture", uuid, item, "local");
    setSaving(false);
    history.back();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Nuevo potrero</h1>
        <div className="island p-4 space-y-3">
          <label className="block text-sm text-neutral-600" htmlFor="name">
            Nombre
          </label>
          <Input
            id="name"
            className="w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="areaHa">
            Área (ha)
          </label>
          <Input
            id="areaHa"
            type="number"
            className="w-full"
            value={form.areaHa}
            onChange={(e) => setForm({ ...form, areaHa: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="notes">
            Notas
          </label>
          <Input
            id="notes"
            className="w-full"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
