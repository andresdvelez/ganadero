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
  const [q, setQ] = useState("");

  function toCSV(items: any[]) {
    const header = ["date", "animalId", "tag", "name", "cause", "notes"].join(
      ","
    );
    const rows = items.map((r: any) =>
      [
        new Date(r.date).toISOString().slice(0, 10),
        r.animal?.id || r.animalId,
        r.animal?.tagNumber || "",
        r.animal?.name || "",
        r.cause || "",
        (r.notes || "").replace(/,/g, " "),
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }

  const filtered = (list.data || []).filter((r: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.animal?.tagNumber?.toLowerCase().includes(s) ||
      r.animal?.name?.toLowerCase().includes(s) ||
      (r.cause || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por causa, arete o nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          variant="secondary"
          onPress={() => {
            const blob = new Blob([toCSV(filtered)], {
              type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `abortos.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Exportar CSV
        </Button>
      </div>

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
        {filtered.map((r: any) => (
          <div key={r.id} className="p-3 text-sm">
            <div className="font-medium">
              {new Date(r.date).toLocaleDateString()}
            </div>
            <div className="text-neutral-600">
              Animal: {r.animal?.name || "(sin nombre)"} #
              {r.animal?.tagNumber || r.animalId}
            </div>
            {r.cause && (
              <div className="text-neutral-600">Causa: {r.cause}</div>
            )}
            {r.notes && <div className="text-neutral-600">{r.notes}</div>}
          </div>
        ))}
        {!filtered.length && (
          <div className="p-3 text-sm text-neutral-600">Sin registros aún.</div>
        )}
      </div>
    </div>
  );
}
