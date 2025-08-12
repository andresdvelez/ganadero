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
  const [selectedAnimalForCCS, setSelectedAnimalForCCS] = useState<string>("");
  const ccs = trpc.mastitis.ccsTrend.useQuery({
    animalId: selectedAnimalForCCS || undefined,
    bucket: "week",
  });
  const makeLab = trpc.mastitis.createLabExam.useMutation();
  const labByCase = trpc.mastitis.labExamByCase.useQuery as any;

  const [form, setForm] = useState({
    animalId: "",
    detectedAt: new Date().toISOString().slice(0, 10),
    quarter: "",
    cmtScore: "",
    bacteria: "",
    treatment: "",
    notes: "",
  });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});

  const filtered = (list.data || []).filter((c: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      c.status?.toLowerCase().includes(s) ||
      c.animal?.tagNumber?.toLowerCase().includes(s) ||
      c.animal?.name?.toLowerCase().includes(s) ||
      (c.bacteria || "").toLowerCase().includes(s) ||
      (c.cmtScore || "").toLowerCase().includes(s)
    );
  });
  const filteredByDate = filtered.filter((c: any) => {
    const d = new Date(c.detectedAt);
    if (period.from && d < new Date(period.from)) return false;
    if (period.to && d > new Date(period.to)) return false;
    return true;
  });
  const perAnimal = (() => {
    const map = new Map<string, Record<string, number>>();
    for (const c of filteredByDate) {
      const id = c.animalId;
      if (!id) continue;
      const rec =
        map.get(id) || ({ LF: 0, LR: 0, RF: 0, RR: 0, OTROS: 0 } as any);
      const q = String(c.quarter || "").toUpperCase();
      if (q === "LF" || q === "LR" || q === "RF" || q === "RR")
        rec[q] = (rec[q] || 0) + 1;
      else rec.OTROS = (rec.OTROS || 0) + 1;
      map.set(id, rec);
    }
    return map;
  })();

  function toCSV(items: any[]) {
    const header = [
      "date",
      "status",
      "animalId",
      "tag",
      "name",
      "quarter",
      "cmt",
      "bacteria",
      "treatment",
      "notes",
    ].join(",");
    const rows = items.map((c: any) =>
      [
        new Date(c.detectedAt).toISOString().slice(0, 10),
        c.status,
        c.animal?.id || c.animalId,
        c.animal?.tagNumber || "",
        c.animal?.name || "",
        c.quarter || "",
        c.cmtScore || "",
        (c.bacteria || "").replace(/,/g, " "),
        (c.treatment || "").replace(/,/g, " "),
        (c.notes || "").replace(/,/g, " "),
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }

  // simple time-bucketed KPI: cases per week
  const series = (() => {
    const m = new Map<string, number>();
    for (const c of filteredByDate) {
      const d = new Date(c.detectedAt);
      const key = `${d.getFullYear()}-W${Math.ceil(
        ((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 +
          new Date(d.getFullYear(), 0, 1).getDay() +
          1) /
          7
      )}`;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1));
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por estado, arete, nombre, bacteria…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Input
          aria-label="Desde"
          type="date"
          value={period.from || ""}
          onChange={(e) =>
            setPeriod((p) => ({ ...p, from: e.target.value || undefined }))
          }
        />
        <Input
          aria-label="Hasta"
          type="date"
          value={period.to || ""}
          onChange={(e) =>
            setPeriod((p) => ({ ...p, to: e.target.value || undefined }))
          }
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="light"
            onPress={() => {
              const d = new Date();
              const from = d.toISOString().slice(0, 10);
              setPeriod({ from, to: from });
            }}
          >
            Hoy
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(to.getDate() - 7);
              setPeriod({
                from: from.toISOString().slice(0, 10),
                to: to.toISOString().slice(0, 10),
              });
            }}
          >
            7d
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(to.getDate() - 30);
              setPeriod({
                from: from.toISOString().slice(0, 10),
                to: to.toISOString().slice(0, 10),
              });
            }}
          >
            30d
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={() => {
              const d = new Date();
              const from = new Date(d.getFullYear(), d.getMonth(), 1);
              const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
              setPeriod({
                from: from.toISOString().slice(0, 10),
                to: to.toISOString().slice(0, 10),
              });
            }}
          >
            Mes
          </Button>
        </div>
        <Button
          variant="secondary"
          onPress={() => {
            const blob = new Blob([toCSV(filteredByDate)], {
              type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mastitis.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Exportar CSV
        </Button>
      </div>

      {/* Mini chart */}
      <Card>
        <CardHeader>
          <CardTitle>Casos de Mastitis por semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-24">
            <svg width="100%" height="100%" viewBox="0 0 200 80">
              {(() => {
                if (series.length === 0) return null;
                const max = Math.max(...series.map(([, v]) => v));
                const stepX = 200 / Math.max(1, series.length - 1);
                const pts = series.map(([, v], i) => {
                  const x = i * stepX;
                  const y = 80 - (v / Math.max(1, max)) * 70 - 5;
                  return `${x},${y}`;
                });
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                      points={pts.join(" ")}
                    />
                    {series.map(([, v], i) => {
                      const x = i * stepX;
                      const y = 80 - (v / Math.max(1, max)) * 70 - 5;
                      return (
                        <circle key={i} cx={x} cy={y} r="2" fill="#0ea5e9" />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calidad: CCS por semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-sm text-neutral-600">
                Animal (opcional)
              </label>
              <AnimalPicker
                value={selectedAnimalForCCS}
                onChange={setSelectedAnimalForCCS}
              />
            </div>
            {selectedAnimalForCCS && perAnimal.get(selectedAnimalForCCS) && (
              <div className="text-xs self-end">
                {(() => {
                  const r = perAnimal.get(selectedAnimalForCCS)!;
                  return `LF:${r.LF || 0} · LR:${r.LR || 0} · RF:${
                    r.RF || 0
                  } · RR:${r.RR || 0} · Otros:${r.OTROS || 0}`;
                })()}
              </div>
            )}
          </div>
          <div className="w-full h-24">
            <svg width="100%" height="100%" viewBox="0 0 200 80">
              {(() => {
                const series = ccs.data?.series || [];
                if (!series.length) return null;
                const max = Math.max(...series.map((s: any) => s.value));
                const stepX = 200 / Math.max(1, series.length - 1);
                const pts = series.map((s: any, i: number) => {
                  const x = i * stepX;
                  const y = 80 - (s.value / Math.max(1, max)) * 70 - 5;
                  return `${x},${y}`;
                });
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#334155"
                      strokeWidth="2"
                      points={pts.join(" ")}
                    />
                    {series.map((s: any, i: number) => {
                      const x = i * stepX;
                      const y = 80 - (s.value / Math.max(1, max)) * 70 - 5;
                      return (
                        <circle key={i} cx={x} cy={y} r="2" fill="#334155" />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </CardContent>
      </Card>

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
        {filteredByDate.map((c: any) => (
          <>
            <div
              key={c.id}
              className="p-3 text-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium flex items-center gap-2">
                  {new Date(c.detectedAt).toLocaleDateString()}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      c.status === "resolved"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="text-neutral-600">
                  Animal: {c.animal?.name || "(sin nombre)"} #
                  {c.animal?.tagNumber || c.animalId}
                </div>
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
                <Button
                  size="sm"
                  onPress={async () => {
                    try {
                      await makeLab.mutateAsync({ caseId: c.id });
                      list.refetch();
                    } catch {}
                  }}
                >
                  Crear examen lab
                </Button>
                {c.labExamId && (
                  <Button asChild size="sm" variant="light">
                    <a href={`/lab?ref=${c.labExamId}`}>Ver examen</a>
                  </Button>
                )}
              </div>
            </div>
            {c.labExamId && (
              <div className="px-3 pb-3 text-xs text-neutral-600">
                Examen asociado: {c.labExamId}
              </div>
            )}
          </>
        ))}
        {!filteredByDate.length && (
          <div className="p-3 text-sm text-neutral-600">Sin casos aún.</div>
        )}
      </div>
    </div>
  );
}
