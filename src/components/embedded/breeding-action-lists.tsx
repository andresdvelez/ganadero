"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BreedingActionLists() {
  const q = trpc.breedingAdv.actionLists.useQuery({});
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Para palpación (30-60 días post-servicio)</CardTitle>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                const rows = (q.data?.toPalpate || []).map((r: any) => ({
                  animal: r.animal?.tagNumber || r.animalId,
                  lastService: new Date(r.lastService)
                    .toISOString()
                    .slice(0, 10),
                }));
                const headers = Object.keys(
                  rows[0] || { animal: "", lastService: "" }
                );
                const csv = [
                  headers.join(","),
                  ...rows.map((r) =>
                    headers
                      .map((h) => JSON.stringify((r as any)[h] ?? ""))
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "repro_para_palpacion.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.data?.toPalpate?.length ? (
            <div className="text-sm divide-y">
              {q.data.toPalpate.map((r: any) => (
                <div
                  key={`${r.animalId}_${r.lastService}`}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    {r.animal?.name || r.animal?.tagNumber} · servicio:{" "}
                    {new Date(r.lastService).toLocaleDateString()}
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
            <div className="text-sm text-neutral-500">Sin pendientes</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Programadas</CardTitle>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                const rows = (q.data?.scheduled || []).map((r: any) => ({
                  animal: r.animal?.tagNumber || r.animalId,
                  scheduledAt: new Date(r.scheduledAt)
                    .toISOString()
                    .slice(0, 10),
                }));
                const headers = Object.keys(
                  rows[0] || { animal: "", scheduledAt: "" }
                );
                const csv = [
                  headers.join(","),
                  ...rows.map((r) =>
                    headers
                      .map((h) => JSON.stringify((r as any)[h] ?? ""))
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "repro_programadas.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.data?.scheduled?.length ? (
            <div className="text-sm divide-y">
              {q.data.scheduled.map((r: any) => (
                <div
                  key={`${r.animalId}_${r.scheduledAt}`}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    {r.animal?.name || r.animal?.tagNumber} ·{" "}
                    {new Date(r.scheduledAt).toLocaleDateString()}
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
            <div className="text-sm text-neutral-500">
              Sin programadas recientes
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sin programar recientes (celo sin servicio)</CardTitle>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                const rows = (q.data?.unscheduled || []).map((r: any) => ({
                  animal: r.animal?.tagNumber || r.animalId,
                  lastHeat: new Date(r.lastHeat).toISOString().slice(0, 10),
                }));
                const headers = Object.keys(
                  rows[0] || { animal: "", lastHeat: "" }
                );
                const csv = [
                  headers.join(","),
                  ...rows.map((r) =>
                    headers
                      .map((h) => JSON.stringify((r as any)[h] ?? ""))
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "repro_sin_programar.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.data?.unscheduled?.length ? (
            <div className="text-sm divide-y">
              {q.data.unscheduled.map((r: any) => (
                <div
                  key={`${r.animalId}_${r.lastHeat}`}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    {r.animal?.name || r.animal?.tagNumber} · celo:{" "}
                    {new Date(r.lastHeat).toLocaleDateString()}
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
            <div className="text-sm text-neutral-500">Sin casos</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Proyección de partos</CardTitle>
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                const rows = (q.data?.dueProjection || []).map((r: any) => ({
                  animal: r.animal?.tagNumber || r.animalId,
                  dueDate: new Date(r.dueDate).toISOString().slice(0, 10),
                }));
                const headers = Object.keys(
                  rows[0] || { animal: "", dueDate: "" }
                );
                const csv = [
                  headers.join(","),
                  ...rows.map((r) =>
                    headers
                      .map((h) => JSON.stringify((r as any)[h] ?? ""))
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "repro_proyeccion_partos.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.data?.dueProjection?.length ? (
            <div className="text-sm divide-y">
              {q.data.dueProjection.map((r: any) => (
                <div
                  key={`${r.animalId}_${r.dueDate}`}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    {r.animal?.name || r.animal?.tagNumber} ·{" "}
                    {new Date(r.dueDate).toLocaleDateString()}
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
            <div className="text-sm text-neutral-500">Sin proyecciones</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
