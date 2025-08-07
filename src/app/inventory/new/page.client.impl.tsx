"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, addToSyncQueue, generateUUID } from "@/lib/dexie";

export default function InventoryNewClient() {
  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "unidad",
    category: "",
    minStock: "",
  });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const uuid = generateUUID();
    const item: any = {
      uuid,
      userId: "local",
      code: form.code,
      name: form.name,
      unit: form.unit,
      category: form.category,
      minStock: form.minStock ? Number(form.minStock) : undefined,
      currentStock: 0,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.products.add(item);
    await addToSyncQueue("create", "product", uuid, item, "local");
    setSaving(false);
    history.back();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Nuevo producto</h1>
        <div className="island p-4 space-y-3">
          <label className="block text-sm text-neutral-600" htmlFor="code">
            Código
          </label>
          <input
            id="code"
            className="w-full border rounded-lg px-3 py-2"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            className="w-full border rounded-lg px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="unit">
            Unidad
          </label>
          <input
            id="unit"
            className="w-full border rounded-lg px-3 py-2"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="category">
            Categoría
          </label>
          <input
            id="category"
            className="w-full border rounded-lg px-3 py-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <label className="block text-sm text-neutral-600" htmlFor="minStock">
            Stock mínimo
          </label>
          <input
            id="minStock"
            className="w-full border rounded-lg px-3 py-2"
            type="number"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
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
