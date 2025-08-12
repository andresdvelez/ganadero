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
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const params = useSearchParams();
  const movements = trpc.inventory.listMovements.useQuery({ limit: 20 });
  const history = trpc.inventory.listMovements.useQuery(
    { productId: activeProductId || undefined, limit: 200 },
    { enabled: !!activeProductId }
  );
  const reverse = trpc.inventory.reverseMovement.useMutation();
  const downloadProductsCsv = () => {
    const header = ["code", "name", "unit", "min", "current"].join(",");
    const body = filtered
      .map((p: any) =>
        [
          p.code || "",
          p.name || "",
          p.unit || "",
          p.minStock ?? "",
          p.currentStock ?? 0,
        ].join(",")
      )
      .join("\n");
    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productos.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const downloadMovementsCsv = () => {
    const rows = movements.data || [];
    const header = [
      "date",
      "type",
      "productId",
      "qty",
      "unitCost",
      "reason",
    ].join(",");
    const body = rows
      .map((m: any) =>
        [
          new Date(m.occurredAt).toISOString(),
          m.type,
          m.productId || "",
          m.quantity,
          m.unitCost ?? "",
          (m.reason || "").replace(/,/g, " "),
        ].join(",")
      )
      .join("\n");
    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movimientos.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const downloadHistoryCsv = () => {
    const rows = history.data || [];
    const header = ["date", "type", "qty", "unitCost", "reason"].join(",");
    const body = rows
      .map((m: any) =>
        [
          new Date(m.occurredAt).toISOString(),
          m.type,
          m.quantity,
          m.unitCost ?? "",
          (m.reason || "").replace(/,/g, " "),
        ].join(",")
      )
      .join("\n");
    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kardex_producto.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex items-center gap-2">
            <input
              className="px-3 py-2 border rounded-lg"
              placeholder="Buscar producto..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button size="sm" variant="flat" onPress={downloadProductsCsv}>
              CSV
            </Button>
          </div>
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
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => setActiveProductId(p.id || p.uuid)}
                  >
                    Ver Kardex
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Movimientos recientes</h2>
          <div className="mb-2">
            <Button size="sm" variant="flat" onPress={downloadMovementsCsv}>
              CSV
            </Button>
          </div>
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

          {activeProductId && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold">Kardex del producto</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => history.refetch()}
                  >
                    Refrescar
                  </Button>
                  <Button size="sm" variant="flat" onPress={downloadHistoryCsv}>
                    CSV
                  </Button>
                  <Button size="sm" onPress={() => setActiveProductId(null)}>
                    Cerrar
                  </Button>
                </div>
              </div>
              {history.data?.length ? (
                <div className="text-sm divide-y mt-2">
                  {history.data.map((m: any) => (
                    <div
                      key={m.id}
                      className="py-1 flex items-center justify-between"
                    >
                      <div>
                        {new Date(m.occurredAt).toLocaleString()} · {m.type} ·{" "}
                        {m.quantity} · {m.unitCost ?? "-"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {m.reason || ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-500 mt-2">
                  Sin movimientos.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
