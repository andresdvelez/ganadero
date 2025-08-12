"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimalPicker } from "@/components/embedded/animal-picker";

export function BreedingAbortions() {
  const list = trpc.breedingAdv.listAbortions.useQuery({ limit: 100 });
  const create = trpc.breedingAdv.createAbortion.useMutation({
    onSuccess: () => list.refetch(),
  });

  const [form, setForm] = useState({
    animalId: "",
    date: new Date().toISOString().slice(0, 10),
    cause: "",
    notes: "",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registrar aborto/natimorto</CardTitle>
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
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              placeholder="Causa (opcional)"
              value={form.cause}
              onChange={(e) => setForm({ ...form, cause: e.target.value })}
            />
            <Input
              placeholder="Notas (opcional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onPress={() =>
                create.mutate({
                  animalId: form.animalId,
                  date: form.date,
                  cause: form.cause || undefined,
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
          <div key={r.id} className="p-3 text-sm">
            <div className="font-medium">
              {new Date(r.date).toLocaleDateString()}
            </div>
            {r.cause && (
              <div className="text-neutral-600">Causa: {r.cause}</div>
            )}
            {r.notes && <div className="text-neutral-600">{r.notes}</div>}
          </div>
        ))}
        {!list.data?.length && (
          <div className="p-3 text-sm text-neutral-600">Sin registros aún.</div>
        )}
      </div>
    </div>
  );
}
