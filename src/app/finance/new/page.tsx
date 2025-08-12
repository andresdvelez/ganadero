"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, generateUUID, addToSyncQueue } from "@/lib/dexie";

export default function FinanceNewPage() {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  async function handleSave() {
    const uuid = generateUUID();
    const payload = {
      uuid,
      userId: "dev-user",
      type,
      category: category || "General",
      amount: Number(amount) || 0,
      currency: "COP",
      date: new Date(date),
      notes: notes || undefined,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await db.financeTransactions.add(payload);
    await addToSyncQueue(
      "create",
      "finance_transaction",
      uuid,
      payload,
      "dev-user"
    );
    router.push("/finance");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Registrar transacción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Tipo</label>
                <select
                  aria-label="Tipo de transacción"
                  title="Tipo de transacción"
                  className="w-full border rounded px-3 py-2"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Categoría</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Venta de ganado, compra de insumos…"
                  title="Categoría"
                  aria-label="Categoría"
                />
              </div>
              <div>
                <label className="text-sm">Monto (COP)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  title="Monto"
                  aria-label="Monto"
                />
              </div>
              <div>
                <label className="text-sm">Fecha</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  title="Fecha"
                  aria-label="Fecha"
                />
              </div>
            </div>
            <div>
              <label className="text-sm" htmlFor="notes">
                Notas
              </label>
              <textarea
                id="notes"
                className="w-full border rounded px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles opcionales"
                title="Notas"
                aria-label="Notas"
              />
            </div>
            <div className="flex gap-2">
              <Button onPress={handleSave}>Guardar</Button>
              <Button
                variant="bordered"
                onPress={() => router.push("/finance")}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
