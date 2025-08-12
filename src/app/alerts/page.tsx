"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

const MODULE_TABS = [
  { id: "all", name: "Todas" },
  { id: "breeding", name: "Reproducción" },
  { id: "milk", name: "Leche" },
  { id: "health", name: "Salud" },
  { id: "inventory", name: "Inventario" },
];

export default function AlertsPage() {
  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState("");
  const list = trpc.alerts.listInstances.useQuery({
    status: "open",
    limit: 200,
  });
  const seed = trpc.alerts.seedDefaultRules.useMutation();
  const evaluate = trpc.alerts.evaluateAll.useMutation({
    onSuccess: () => list.refetch(),
  });
  const update = trpc.alerts.updateInstance.useMutation({
    onSuccess: () => list.refetch(),
  });

  useEffect(() => {
    // Seed default rules once per session
    if (!list.isFetching) seed.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const items = list.data || [];
    return items
      .filter((i: any) =>
        active === "all" ? true : (i.rule?.module || "") === active
      )
      .filter((i: any) =>
        q.trim()
          ? (i.rule?.name || "").toLowerCase().includes(q.toLowerCase()) ||
            (i.entityType || "").toLowerCase().includes(q.toLowerCase()) ||
            (i.entityId || "").toLowerCase().includes(q.toLowerCase())
          : true
      );
  }, [list.data, active, q]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const toggleSelect = (id: string) =>
    setSelected((m) => ({ ...m, [id]: !m[id] }));
  const resolveSelected = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    for (const id of ids) {
      await update.mutateAsync({ id, status: "resolved" });
    }
    setSelected({});
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Alertas y listas de acción</h1>
          <div className="flex items-center gap-2">
            <input
              aria-label="Buscar"
              placeholder="Buscar…"
              className="border rounded-md px-2 py-1 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button size="sm" variant="flat" onPress={() => evaluate.mutate()}>
              Evaluar reglas
            </Button>
            <Button size="sm" variant="solid" onPress={resolveSelected}>
              Resolver seleccionadas
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {MODULE_TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={active === t.id ? "solid" : "flat"}
              onPress={() => setActive(t.id)}
            >
              {t.name}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Abiertas ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-sm text-neutral-500">
                No hay alertas abiertas.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((a: any) => (
                  <div
                    key={a.id}
                    className="py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar"
                        checked={!!selected[a.id]}
                        onChange={() => toggleSelect(a.id)}
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {a.rule?.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {a.rule?.module} · {a.entityType} · {a.entityId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() =>
                          update.mutate({ id: a.id, status: "acknowledged" })
                        }
                      >
                        Reconocer
                      </Button>
                      <Button
                        size="sm"
                        variant="solid"
                        onPress={() =>
                          update.mutate({ id: a.id, status: "resolved" })
                        }
                      >
                        Resolver
                      </Button>
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
