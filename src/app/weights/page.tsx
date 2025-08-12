"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function WeightsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Pesajes y Canal</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <WeightsCreate />
          <CarcassCreate />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <WeightsList />
          <CarcassList />
        </div>
      </div>
    </DashboardLayout>
  );
}

function WeightsCreate() {
  const create = trpc.weights.createWeight.useMutation();
  const [form, setForm] = useState({
    animalId: "",
    weighedAt: new Date().toISOString().slice(0, 10),
    weightKg: "",
    method: "",
    source: "",
    notes: "",
  });
  const disabled = !form.animalId || !form.weighedAt || !form.weightKg;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar pesaje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          placeholder="Animal ID"
          value={form.animalId}
          onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        />
        <Input
          type="date"
          value={form.weighedAt}
          onChange={(e) => setForm({ ...form, weighedAt: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Peso (kg)"
          value={form.weightKg}
          onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
        />
        <Input
          placeholder="Método (opcional)"
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
        />
        <Input
          placeholder="Fuente (opcional)"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
        <Input
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Button
          size="sm"
          isDisabled={disabled}
          onPress={() =>
            create.mutate({
              animalId: form.animalId,
              weighedAt: form.weighedAt,
              weightKg: Number(form.weightKg || 0),
              method: form.method || undefined,
              source: form.source || undefined,
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

function WeightsList() {
  const params = useSearchParams();
  const router = useRouter();
  const [animalId, setAnimalId] = useState("");
  useEffect(() => {
    const aid = params.get("animalId");
    if (aid) setAnimalId(aid);
  }, [params]);
  const list = trpc.weights.listWeights.useQuery({
    animalId: animalId || undefined,
    limit: 200,
  });
  const rows = list.data || [];
  const csv = useMemo(() => {
    const header = [
      "date",
      "animalId",
      "weightKg",
      "method",
      "source",
      "notes",
    ].join(",");
    const body = rows
      .map((r: any) =>
        [
          new Date(r.weighedAt).toISOString().slice(0, 10),
          r.animalId,
          r.weightKg,
          r.method || "",
          r.source || "",
          (r.notes || "").replace(/,/g, " "),
        ].join(",")
      )
      .join("\n");
    return [header, body].join("\n");
  }, [rows]);
  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pesajes.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pesajes recientes ({rows.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar por animalId"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
            />
            <Button size="sm" variant="flat" onPress={download}>
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-neutral-500">Sin datos</div>
        ) : (
          <div className="text-sm divide-y">
            {rows.map((r: any) => (
              <div key={r.id} className="py-1 flex justify-between">
                <div>
                  {new Date(r.weighedAt).toLocaleDateString()} · {r.animalId}
                </div>
                <div className="font-medium flex items-center gap-3">
                  {r.weightKg} kg
                  <a
                    className="text-xs underline"
                    href={`?animalId=${encodeURIComponent(r.animalId)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setAnimalId(r.animalId);
                      router.push(
                        `?animalId=${encodeURIComponent(r.animalId)}`
                      );
                    }}
                  >
                    Filtrar por este animal
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CarcassCreate() {
  const create = trpc.weights.createCarcass.useMutation();
  const [form, setForm] = useState({
    animalId: "",
    date: new Date().toISOString().slice(0, 10),
    hot: "",
    cold: "",
    dressing: "",
    grade: "",
    notes: "",
  });
  const disabled = !form.animalId || !form.date;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar canal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          placeholder="Animal ID"
          value={form.animalId}
          onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        />
        <Input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Canal caliente (kg)"
          value={form.hot}
          onChange={(e) => setForm({ ...form, hot: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Canal fría (kg)"
          value={form.cold}
          onChange={(e) => setForm({ ...form, cold: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Rendimiento (%)"
          value={form.dressing}
          onChange={(e) => setForm({ ...form, dressing: e.target.value })}
        />
        <Input
          placeholder="Grado (opcional)"
          value={form.grade}
          onChange={(e) => setForm({ ...form, grade: e.target.value })}
        />
        <Input
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Button
          size="sm"
          isDisabled={disabled}
          onPress={() =>
            create.mutate({
              animalId: form.animalId,
              date: form.date,
              hotCarcassKg: form.hot ? Number(form.hot) : undefined,
              coldCarcassKg: form.cold ? Number(form.cold) : undefined,
              dressingPct: form.dressing ? Number(form.dressing) : undefined,
              grade: form.grade || undefined,
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

function CarcassList() {
  const params = useSearchParams();
  const router = useRouter();
  const [animalId, setAnimalId] = useState("");
  useEffect(() => {
    const aid = params.get("animalId");
    if (aid) setAnimalId(aid);
  }, [params]);
  const list = trpc.weights.listCarcass.useQuery({
    animalId: animalId || undefined,
    limit: 200,
  });
  const rows = list.data || [];
  const csv = useMemo(() => {
    const header = [
      "date",
      "animalId",
      "hot",
      "cold",
      "dressingPct",
      "grade",
      "notes",
    ].join(",");
    const body = rows
      .map((r: any) =>
        [
          new Date(r.date).toISOString().slice(0, 10),
          r.animalId,
          r.hotCarcassKg || "",
          r.coldCarcassKg || "",
          r.dressingPct || "",
          r.grade || "",
          (r.notes || "").replace(/,/g, " "),
        ].join(",")
      )
      .join("\n");
    return [header, body].join("\n");
  }, [rows]);
  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canales.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Canales recientes ({rows.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar por animalId"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
            />
            <Button size="sm" variant="flat" onPress={download}>
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-neutral-500">Sin datos</div>
        ) : (
          <div className="text-sm divide-y">
            {rows.map((r: any) => (
              <div key={r.id} className="py-1">
                {new Date(r.date).toLocaleDateString()} · {r.animalId} ·{" "}
                {r.hotCarcassKg || "-"}/{r.coldCarcassKg || "-"} kg ·{" "}
                {r.dressingPct ? `${r.dressingPct}%` : "-"}{" "}
                {r.grade ? `· ${r.grade}` : ""}
                <a
                  className="ml-2 text-xs underline"
                  href={`?animalId=${encodeURIComponent(r.animalId)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setAnimalId(r.animalId);
                    router.push(`?animalId=${encodeURIComponent(r.animalId)}`);
                  }}
                >
                  Filtrar por este animal
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
