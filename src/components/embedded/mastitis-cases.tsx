"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimalPicker } from "@/components/embedded/animal-picker";

export function MastitisCases() {
  const list = trpc.mastitis.list.useQuery({ limit: 100 });
  const create = trpc.mastitis.create.useMutation({
    onSuccess: () => list.refetch(),
  });
  const update = trpc.mastitis.update.useMutation({
    onSuccess: () => list.refetch(),
  });

  const [form, setForm] = useState({
    animalId: "",
    detectedAt: new Date().toISOString().slice(0, 10),
    quarter: "",
    cmtScore: "",
    bacteria: "",
    treatment: "",
    notes: "",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registrar caso de mastitis</CardTitle>
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
              value={form.detectedAt}
              onChange={(e) => setForm({ ...form, detectedAt: e.target.value })}
            />
            <Input
              placeholder="Cuadrante (LF/LR/RF/RR)"
              value={form.quarter}
              onChange={(e) => setForm({ ...form, quarter: e.target.value })}
            />
            <Input
              placeholder="CMT/CCS"
              value={form.cmtScore}
              onChange={(e) => setForm({ ...form, cmtScore: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Bacteria (opcional)"
              value={form.bacteria}
              onChange={(e) => setForm({ ...form, bacteria: e.target.value })}
            />
            <Input
              placeholder="Tratamiento (opcional)"
              value={form.treatment}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
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
                  detectedAt: form.detectedAt,
                  quarter: form.quarter || undefined,
                  cmtScore: form.cmtScore || undefined,
                  bacteria: form.bacteria || undefined,
                  treatment: form.treatment || undefined,
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
        {list.data?.map((c: any) => (
          <div
            key={c.id}
            className="p-3 text-sm flex items-center justify-between"
          >
            <div>
              <div className="font-medium">
                {new Date(c.detectedAt).toLocaleDateString()} — {c.status}
              </div>
              <div className="text-neutral-600">Animal: {c.animalId}</div>
              {c.quarter && (
                <div className="text-neutral-600">Cuadrante: {c.quarter}</div>
              )}
              {c.cmtScore && (
                <div className="text-neutral-600">CMT/CCS: {c.cmtScore}</div>
              )}
              {c.bacteria && (
                <div className="text-neutral-600">Bacteria: {c.bacteria}</div>
              )}
              {c.treatment && (
                <div className="text-neutral-600">
                  Tratamiento: {c.treatment}
                </div>
              )}
              {c.notes && <div className="text-neutral-600">{c.notes}</div>}
            </div>
            <div className="flex gap-2">
              {c.status !== "resolved" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    update.mutate({ id: c.id, data: { status: "resolved" } })
                  }
                >
                  Resolver
                </Button>
              )}
            </div>
          </div>
        ))}
        {!list.data?.length && (
          <div className="p-3 text-sm text-neutral-600">Sin casos aún.</div>
        )}
      </div>
    </div>
  );
}
