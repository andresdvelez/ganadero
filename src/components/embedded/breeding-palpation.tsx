"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimalPicker } from "@/components/embedded/animal-picker";

export function BreedingPalpation() {
  const list = trpc.breedingAdv.listPalpations.useQuery({ limit: 100 });
  const create = trpc.breedingAdv.createPalpation.useMutation({
    onSuccess: () => list.refetch(),
  });

  const [form, setForm] = useState({
    animalId: "",
    palpationDate: new Date().toISOString().slice(0, 10),
    result: "unknown",
    technician: "",
    notes: "",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registrar palpación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-neutral-600">Animal</label>
            <AnimalPicker
              value={form.animalId}
              onChange={(id) => setForm({ ...form, animalId: id })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              type="date"
              value={form.palpationDate}
              onChange={(e) =>
                setForm({ ...form, palpationDate: e.target.value })
              }
            />
            <select
              aria-label="Resultado de palpación"
              className="w-full border rounded-lg px-3 py-2"
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
            >
              <option value="pregnant">Preñada</option>
              <option value="open">Vacía</option>
              <option value="unknown">Desconocido</option>
            </select>
            <Input
              placeholder="Técnico (opcional)"
              value={form.technician}
              onChange={(e) => setForm({ ...form, technician: e.target.value })}
            />
          </div>
          <Input
            placeholder="Notas (opcional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              onPress={() =>
                create.mutate({
                  animalId: form.animalId,
                  palpationDate: form.palpationDate,
                  result: form.result as any,
                  technician: form.technician || undefined,
                  notes: form.notes || undefined,
                })
              }
              isDisabled={create.isPending || !form.animalId}
            >
              {create.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border divide-y">
        {list.data?.map((r: any) => (
          <div
            key={r.id}
            className="p-3 text-sm flex items-center justify-between"
          >
            <div>
              <div className="font-medium">
                {new Date(r.palpationDate).toLocaleDateString()} — {r.result}
              </div>
              {r.technician && (
                <div className="text-neutral-600">Técnico: {r.technician}</div>
              )}
              {r.notes && <div className="text-neutral-600">{r.notes}</div>}
            </div>
          </div>
        ))}
        {!list.data?.length && (
          <div className="p-3 text-sm text-neutral-600">
            Sin palpaciones aún.
          </div>
        )}
      </div>
    </div>
  );
}
