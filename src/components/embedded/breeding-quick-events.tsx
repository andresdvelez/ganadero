"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimalPicker } from "@/components/embedded/animal-picker";

export function BreedingQuickEvents() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <HeatForm />
      <ServiceForm />
      <BirthForm />
      <TodayHeats />
    </div>
  );
}

function HeatForm() {
  const create = trpc.breedingAdv.createHeat.useMutation();
  const [form, setForm] = useState({
    animalId: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar celo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimalPicker
          value={form.animalId}
          onChange={(id) => setForm((f) => ({ ...f, animalId: id }))}
        />
        <Input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        <Input
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <Button
          size="sm"
          isDisabled={!form.animalId}
          onPress={() =>
            create.mutate({
              animalId: form.animalId,
              date: form.date,
              notes: form.notes || undefined,
            })
          }
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function ServiceForm() {
  const create = trpc.breedingAdv.createService.useMutation();
  const [form, setForm] = useState({
    animalId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "IA" as "IA" | "MN" | "TE",
    sireId: "",
    notes: "",
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar servicio (IA/MN/TE)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimalPicker
          value={form.animalId}
          onChange={(id) => setForm((f) => ({ ...f, animalId: id }))}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <select
            aria-label="Tipo"
            className="border rounded-md px-2 py-2 text-sm"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as any }))
            }
          >
            <option value="IA">IA</option>
            <option value="MN">MN</option>
            <option value="TE">TE</option>
          </select>
          <Input
            placeholder="Semental/Donador (opcional)"
            value={form.sireId}
            onChange={(e) => setForm((f) => ({ ...f, sireId: e.target.value }))}
          />
        </div>
        <Input
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <Button
          size="sm"
          isDisabled={!form.animalId}
          onPress={() =>
            create.mutate({
              animalId: form.animalId,
              date: form.date,
              type: form.type,
              sireId: form.sireId || undefined,
              notes: form.notes || undefined,
            })
          }
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function BirthForm() {
  const create = trpc.breedingAdv.createBirth.useMutation();
  const [form, setForm] = useState({
    animalId: "",
    date: new Date().toISOString().slice(0, 10),
    offspringCount: "",
    notes: "",
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar parto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimalPicker
          value={form.animalId}
          onChange={(id) => setForm((f) => ({ ...f, animalId: id }))}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="N° crías (opcional)"
            value={form.offspringCount}
            onChange={(e) =>
              setForm((f) => ({ ...f, offspringCount: e.target.value }))
            }
          />
        </div>
        <Input
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <Button
          size="sm"
          isDisabled={!form.animalId}
          onPress={() =>
            create.mutate({
              animalId: form.animalId,
              date: form.date,
              offspringCount: form.offspringCount
                ? Number(form.offspringCount)
                : undefined,
              notes: form.notes || undefined,
            })
          }
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function TodayHeats() {
  const today = new Date().toISOString().slice(0, 10);
  const list = trpc.breedingAdv.listHeats.useQuery({ date: today });
  const download = () => {
    const rows = (list.data || []).map((r: any) => ({
      date: new Date(r.eventDate).toISOString(),
      tag: r.animal?.tagNumber || r.animalId,
      name: r.animal?.name || "",
    }));
    const headers = Object.keys(rows[0] || { date: "", tag: "", name: "" });
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "celos_hoy.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Celos de hoy</CardTitle>
          <Button size="sm" variant="flat" onPress={download}>
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {list.data?.length ? (
          <div className="text-sm divide-y">
            {list.data.map((r: any) => (
              <div
                key={r.id}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  {new Date(r.eventDate).toLocaleString()} ·{" "}
                  {r.animal?.tagNumber || r.animalId}{" "}
                  {r.animal?.name ? `· ${r.animal?.name}` : ""}
                </div>
                <a
                  className="text-xs underline"
                  href={`/breeding?animalId=${r.animalId}`}
                >
                  Abrir
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Sin registros hoy.</div>
        )}
      </CardContent>
    </Card>
  );
}
