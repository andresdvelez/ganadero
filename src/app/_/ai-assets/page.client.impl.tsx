"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AIAssetsClient() {
  const [tab, setTab] = useState("tanks");
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">IA — Termos, Semen y Embriones</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="tanks">Termos</TabsTrigger>
            <TabsTrigger value="semen">Semen</TabsTrigger>
            <TabsTrigger value="embryos">Embriones</TabsTrigger>
          </TabsList>
          <TabsContent value="tanks">
            <TanksTab />
          </TabsContent>
          <TabsContent value="semen">
            <SemenTab />
          </TabsContent>
          <TabsContent value="embryos">
            <EmbryosTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function TanksTab() {
  const list = trpc.aiAssets.listTanks.useQuery();
  const create = trpc.aiAssets.createTank.useMutation({
    onSuccess: () => list.refetch(),
  });
  const [form, setForm] = useState({ name: "", serial: "" });
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="island p-4">
        <div className="font-semibold mb-2">Crear termo</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Serial (opcional)"
            value={form.serial}
            onChange={(e) => setForm({ ...form, serial: e.target.value })}
          />
        </div>
        <div className="mt-2">
          <Button
            size="sm"
            onPress={() =>
              create.mutate({
                name: form.name,
                serial: form.serial || undefined,
              })
            }
            isDisabled={!form.name}
          >
            Guardar
          </Button>
        </div>
      </div>
      <div className="island p-4">
        <div className="font-semibold mb-2">Lista</div>
        {list.data?.length ? (
          <div className="text-sm divide-y">
            {list.data.map((t) => (
              <div key={t.id} className="py-1">
                {t.name} {t.serial ? `· ${t.serial}` : ""}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Sin termos</div>
        )}
      </div>
    </div>
  );
}

function SemenTab() {
  const list = trpc.aiAssets.listSemenBatches.useQuery({});
  const create = trpc.aiAssets.createSemenBatch.useMutation({
    onSuccess: () => list.refetch(),
  });
  const move = trpc.aiAssets.moveSemen.useMutation({
    onSuccess: () => list.refetch(),
  });
  const [form, setForm] = useState({ code: "", straws: "" });
  const [moveQty, setMoveQty] = useState(1);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="island p-4">
        <div className="font-semibold mb-2">Crear lote de semen</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            placeholder="Código"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            placeholder="Pajuelas"
            type="number"
            value={form.straws}
            onChange={(e) => setForm({ ...form, straws: e.target.value })}
          />
          <Button
            size="sm"
            onPress={() =>
              create.mutate({
                code: form.code,
                strawCount: form.straws ? Number(form.straws) : 0,
              })
            }
            isDisabled={!form.code}
          >
            Guardar
          </Button>
        </div>
      </div>
      <div className="island p-4">
        <div className="font-semibold mb-2">Lotes</div>
        {list.data?.length ? (
          <div className="text-sm divide-y">
            {list.data.map((b) => (
              <div
                key={b.id}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  {b.code} · {b.breed || ""} · {b.strawCount} pajuelas
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    type="number"
                    placeholder="Cant"
                    value={String(moveQty)}
                    onChange={(e) =>
                      setMoveQty(parseInt(e.target.value || "1"))
                    }
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() =>
                      move.mutate({
                        semenBatchId: b.id,
                        type: "out",
                        quantity: moveQty,
                        date: new Date().toISOString(),
                      })
                    }
                  >
                    Usar
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() =>
                      move.mutate({
                        semenBatchId: b.id,
                        type: "in",
                        quantity: moveQty,
                        date: new Date().toISOString(),
                      })
                    }
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Sin lotes</div>
        )}
      </div>
    </div>
  );
}

function EmbryosTab() {
  const list = trpc.aiAssets.listEmbryoBatches.useQuery({});
  const create = trpc.aiAssets.createEmbryoBatch.useMutation({
    onSuccess: () => list.refetch(),
  });
  const move = trpc.aiAssets.moveEmbryo.useMutation({
    onSuccess: () => list.refetch(),
  });
  const [form, setForm] = useState({ code: "", straws: "" });
  const [moveQty, setMoveQty] = useState(1);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="island p-4">
        <div className="font-semibold mb-2">Crear lote de embriones</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            placeholder="Código"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            placeholder="Pajuelas"
            type="number"
            value={form.straws}
            onChange={(e) => setForm({ ...form, straws: e.target.value })}
          />
          <Button
            size="sm"
            onPress={() =>
              create.mutate({
                code: form.code,
                strawCount: form.straws ? Number(form.straws) : 0,
              })
            }
            isDisabled={!form.code}
          >
            Guardar
          </Button>
        </div>
      </div>
      <div className="island p-4">
        <div className="font-semibold mb-2">Lotes</div>
        {list.data?.length ? (
          <div className="text-sm divide-y">
            {list.data.map((b) => (
              <div
                key={b.id}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  {b.code} · {b.stage || ""} · {b.strawCount} pajuelas
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    type="number"
                    placeholder="Cant"
                    value={String(moveQty)}
                    onChange={(e) =>
                      setMoveQty(parseInt(e.target.value || "1"))
                    }
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() =>
                      move.mutate({
                        embryoBatchId: b.id,
                        type: "out",
                        quantity: moveQty,
                        date: new Date().toISOString(),
                      })
                    }
                  >
                    Usar
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() =>
                      move.mutate({
                        embryoBatchId: b.id,
                        type: "in",
                        quantity: moveQty,
                        date: new Date().toISOString(),
                      })
                    }
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Sin lotes</div>
        )}
      </div>
    </div>
  );
}
