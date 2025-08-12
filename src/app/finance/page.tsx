"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/dexie";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function FinancePage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    db.financeTransactions
      .toArray()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <Link href="/finance/new">
            <Button>Registrar transacción</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-sm text-neutral-500">
                No hay transacciones todavía.
              </div>
            ) : (
              <div className="divide-y">
                {items.map((t) => (
                  <div
                    key={t.uuid}
                    className="py-2 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        {t.type === "income" ? "Ingreso" : "Egreso"} ·{" "}
                        {t.category || "General"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(t.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      ${t.amount?.toLocaleString("es-CO")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
