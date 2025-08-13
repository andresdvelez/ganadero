"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export default function MilkClient() {
  const [records, setRecords] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const kpis = trpc.milk.kpis.useQuery({
    from: from || undefined,
    to: to || undefined,
  });

  useEffect(() => {
    (async () => {
      const list = await db.milkRecords
        .orderBy("recordedAt")
        .reverse()
        .toArray();
      setRecords(list);
    })();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setQ(qp);
  }, [params]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.recordedAt);
      const inRange =
        (!from || d >= new Date(from)) && (!to || d <= new Date(to));
      const when = d.toLocaleDateString();
      const text = `${r.session || ""} ${when}`.toLowerCase();
      return inRange && text.includes(q.toLowerCase());
    });
  }, [records, from, to, q]);

  const total = filtered.reduce((sum, r) => sum + (r.liters || 0), 0);

  const downloadCsv = () => {
    const header = [
      "date",
      "session",
      "liters",
      "fatPct",
      "proteinPct",
      "ccs",
      "animalId",
      "notes",
    ];
    const body = filtered.map((r: any) =>
      [
        new Date(r.recordedAt).toISOString(),
        r.session || "",
        r.liters || 0,
        r.fatPct ?? "",
        r.proteinPct ?? "",
        r.ccs ?? "",
        r.animalId || "",
        String(r.notes || "").replace(/,/g, " "),
      ].join(",")
    );
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "control_lechero.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const setQuick = (kind: "today" | "7d" | "30d" | "month") => {
    const now = new Date();
    if (kind === "today") {
      const d = now.toISOString().slice(0, 10);
      setFrom(d);
      setTo(d);
      return;
    }
    if (kind === "7d" || kind === "30d") {
      const days = kind === "7d" ? 7 : 30;
      const start = new Date(now);
      start.setDate(now.getDate() - days);
      setFrom(start.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
      return;
    }
    // month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Control Lechero</h1>
          <div className="flex items-center gap-2">
            <input
              className="px-3 py-2 border rounded-lg"
              placeholder="Buscar (AM/PM o fecha)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <input
              aria-label="Desde"
              className="px-3 py-2 border rounded-lg"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              aria-label="Hasta"
              className="px-3 py-2 border rounded-lg"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button size="sm" variant="light" onPress={() => setQuick("today")}>
              Hoy
            </Button>
            <Button size="sm" variant="light" onPress={() => setQuick("7d")}>
              7d
            </Button>
            <Button size="sm" variant="light" onPress={() => setQuick("30d")}>
              30d
            </Button>
            <Button size="sm" variant="light" onPress={() => setQuick("month")}>
              Mes
            </Button>
            <Button size="sm" variant="flat" onPress={downloadCsv}>
              CSV
            </Button>
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                window.dispatchEvent(
                  new CustomEvent("ai-seed-report", {
                    detail: {
                      module: "milk",
                      from: from || null,
                      to: to || null,
                    },
                  })
                );
              }}
            >
              Abrir en chat
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="island p-4">
            <div className="text-sm text-neutral-500">Total litros</div>
            <div className="text-2xl font-semibold">{total.toFixed(1)} L</div>
          </div>
          <div className="island p-4">
            <div className="text-sm text-neutral-500">CCS promedio hato</div>
            <div className="text-2xl font-semibold">
              {kpis.data
                ? Math.round(kpis.data.herdAvgCCS || 0).toLocaleString()
                : "-"}
            </div>
          </div>
          <div className="island p-4">
            <div className="text-sm text-neutral-500">Registros</div>
            <div className="text-2xl font-semibold">{filtered.length}</div>
          </div>
          <div className="island p-4">
            <div className="text-sm text-neutral-500">Animales con datos</div>
            <div className="text-2xl font-semibold">
              {new Set(filtered.map((r) => r.animalId).filter(Boolean)).size}
            </div>
          </div>
        </div>

        {kpis.data?.topLiters?.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="island p-4">
              <div className="font-semibold mb-2">Top litros por animal</div>
              <div className="text-sm divide-y">
                {kpis.data.topLiters.map((x: any) => (
                  <div
                    key={x.animalId}
                    className="py-1 flex items-center justify-between"
                  >
                    <div>
                      {x.animal?.tagNumber || x.animalId}{" "}
                      {x.animal?.name ? `· ${x.animal.name}` : ""}
                    </div>
                    <div className="font-medium">
                      {(x.liters || 0).toFixed(1)} L
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="island p-4">
              <div className="font-semibold mb-2">Top CCS (promedio)</div>
              <div className="text-sm divide-y">
                {kpis.data.topCCS?.map((x: any) => (
                  <div
                    key={x.animalId}
                    className="py-1 flex items-center justify-between"
                  >
                    <div>
                      {x.animal?.tagNumber || x.animalId}{" "}
                      {x.animal?.name ? `· ${x.animal.name}` : ""}
                    </div>
                    <div className="font-medium">
                      {Math.round(x.avgCCS || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="text-neutral-600">Sin registros de leche.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li
                key={r.uuid}
                className="island p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm text-neutral-500">{r.session}</div>
                  <div className="font-medium">
                    {new Date(r.recordedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-lg font-semibold">{r.liters} L</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
