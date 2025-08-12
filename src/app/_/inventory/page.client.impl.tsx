"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export default function InventoryClient() {
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();
  const movements = trpc.inventory.listMovements.useQuery({ limit: 20 });
  const reverse = trpc.inventory.reverseMovement.useMutation();

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

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Movimientos recientes</h2>
          {movements.data?.length ? (
            <div className="divide-y">
              {movements.data.map((m) => (
                <div
                  key={m.id}
                  className="py-2 flex items-center justify-between text-sm"
                >
                  <div>
                    {m.type.toUpperCase()} · {m.quantity}{" "}
                    {m.unitCost ? `· $${m.unitCost}` : ""} ·{" "}
                    {new Date(m.occurredAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {!(m as any).isReversal && (
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={async () => {
                          await reverse.mutateAsync({ id: m.id });
                          movements.refetch();
                        }}
                      >
                        Revertir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-neutral-500">Sin movimientos.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
