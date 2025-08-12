"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimalPicker } from "@/components/embedded/animal-picker";

export function BreedingSync() {
  const utils = trpc.useUtils?.() as any;
  const list = trpc.breedingAdv.listSyncBatches.useQuery({ limit: 100 });
  const createBatch = trpc.breedingAdv.createSyncBatch.useMutation({
    onSuccess: () => list.refetch(),
  });
  const addAnimal = trpc.breedingAdv.addAnimalToBatch.useMutation({
    onSuccess: () => list.refetch(),
  });
  const updateAnimal = trpc.breedingAdv.updateSyncAnimal.useMutation({
    onSuccess: () => list.refetch(),
  });

  const [form, setForm] = useState({
    protocol: "",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [addingForBatchId, setAddingForBatchId] = useState<string | null>(null);
  const [newAnimal, setNewAnimal] = useState<{
    animalId?: string;
    status?: string;
    date?: string;
    notes?: string;
  }>({});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear lote de sincronización</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Protocolo (opcional)"
              value={form.protocol}
              onChange={(e) => setForm({ ...form, protocol: e.target.value })}
            />
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              placeholder="Notas"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onPress={() =>
                createBatch.mutate({
                  protocol: form.protocol || undefined,
                  startDate: form.startDate,
                  notes: form.notes || undefined,
                })
              }
              isDisabled={createBatch.isPending}
            >
              {createBatch.isPending ? "Creando…" : "Crear lote"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {list.data?.map((b: any) => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lote {b.protocol || "(sin protocolo)"}</span>
                <span className="text-sm text-neutral-600">
                  Inicio: {new Date(b.startDate).toLocaleDateString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-end">
                {addingForBatchId === b.id ? (
                  <Button size="sm" onPress={() => setAddingForBatchId(null)}>
                    Cancelar
                  </Button>
                ) : (
                  <Button size="sm" onPress={() => setAddingForBatchId(b.id)}>
                    Agregar animales
                  </Button>
                )}
              </div>
              {addingForBatchId === b.id && (
                <div className="p-3 rounded-lg border space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-neutral-600">Animal</label>
                      <AnimalPicker
                        value={newAnimal.animalId}
                        onChange={(id) =>
                          setNewAnimal({ ...newAnimal, animalId: id })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm text-neutral-600">
                          Estado
                        </label>
                        <select
                          aria-label="Estado de sincronización"
                          className="w-full border rounded-lg px-3 py-2"
                          value={newAnimal.status || "scheduled"}
                          onChange={(e) =>
                            setNewAnimal({
                              ...newAnimal,
                              status: e.target.value,
                            })
                          }
                        >
                          <option value="scheduled">Programado</option>
                          <option value="applied">Aplicado</option>
                          <option value="inseminated">Inseminado</option>
                          <option value="failed">Fallido</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-600">
                          Fecha
                        </label>
                        <Input
                          type="date"
                          value={
                            newAnimal.date ||
                            new Date().toISOString().slice(0, 10)
                          }
                          onChange={(e) =>
                            setNewAnimal({ ...newAnimal, date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <Input
                    placeholder="Notas (opcional)"
                    value={newAnimal.notes || ""}
                    onChange={(e) =>
                      setNewAnimal({ ...newAnimal, notes: e.target.value })
                    }
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onPress={() => {
                        if (!newAnimal.animalId) return;
                        addAnimal.mutate({
                          batchId: b.id,
                          animalId: newAnimal.animalId,
                          status: newAnimal.status,
                          date: newAnimal.date,
                          notes: newAnimal.notes,
                        });
                      }}
                    >
                      {addAnimal.isPending ? "Guardando…" : "Agregar al lote"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border divide-y">
                {b.animals?.length ? (
                  b.animals.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-2 flex items-center justify-between"
                    >
                      <div className="text-sm">
                        <div className="font-medium">Animal: {a.animalId}</div>
                        <div className="text-neutral-600">
                          Estado: {a.status || "-"}
                        </div>
                        {a.date && (
                          <div className="text-neutral-600">
                            Fecha: {new Date(a.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            updateAnimal.mutate({
                              id: a.id,
                              status: "inseminated",
                            })
                          }
                        >
                          Marcar IA
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            updateAnimal.mutate({ id: a.id, status: "failed" })
                          }
                        >
                          Falló
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-neutral-600">
                    Sin animales en el lote.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.data?.length === 0 && (
          <div className="text-neutral-600">Sin lotes aún.</div>
        )}
      </div>
    </div>
  );
}
