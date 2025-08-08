"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";

export default function InventoryClient() {
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const list = await db.products.orderBy("name").toArray();
      setProducts(list);
    })();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setQ(qp);
  }, [params]);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        [p.name, p.code, p.category].some((v: string) =>
          v?.toLowerCase().includes(q.toLowerCase())
        )
      ),
    [products, q]
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inventario</h1>
          <input
            className="px-3 py-2 border rounded-lg"
            placeholder="Buscar producto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-neutral-600">Sin productos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <div key={p.uuid} className="island p-4">
                <div className="text-sm text-neutral-500">{p.code}</div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm">
                  Stock: {p.currentStock} {p.unit}
                </div>
                {p.minStock != null && (
                  <div className="text-xs text-neutral-500">
                    Mínimo: {p.minStock}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
