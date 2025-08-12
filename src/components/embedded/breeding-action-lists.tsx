"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BreedingActionLists() {
  const q = trpc.breedingAdv.actionLists.useQuery({});
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Para palpación (30-60 días post-servicio)</CardTitle>
        </CardHeader>
        <CardContent>
          {q.data?.toPalpate?.length ? (
            <div className="text-sm divide-y">
              {q.data.toPalpate.map((r: any) => (
                <div key={`${r.animalId}_${r.lastService}`} className="py-2">
                  {r.animal?.name || r.animal?.tagNumber} · servicio:{" "}
                  {new Date(r.lastService).toLocaleDateString()}
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
          <CardTitle>Programadas</CardTitle>
        </CardHeader>
        <CardContent>
          {q.data?.scheduled?.length ? (
            <div className="text-sm divide-y">
              {q.data.scheduled.map((r: any) => (
                <div key={`${r.animalId}_${r.scheduledAt}`} className="py-2">
                  {r.animal?.name || r.animal?.tagNumber} ·{" "}
                  {new Date(r.scheduledAt).toLocaleDateString()}
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
          <CardTitle>Sin programar recientes (celo sin servicio)</CardTitle>
        </CardHeader>
        <CardContent>
          {q.data?.unscheduled?.length ? (
            <div className="text-sm divide-y">
              {q.data.unscheduled.map((r: any) => (
                <div key={`${r.animalId}_${r.lastHeat}`} className="py-2">
                  {r.animal?.name || r.animal?.tagNumber} · celo:{" "}
                  {new Date(r.lastHeat).toLocaleDateString()}
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
          <CardTitle>Proyección de partos</CardTitle>
        </CardHeader>
        <CardContent>
          {q.data?.dueProjection?.length ? (
            <div className="text-sm divide-y">
              {q.data.dueProjection.map((r: any) => (
                <div key={`${r.animalId}_${r.dueDate}`} className="py-2">
                  {r.animal?.name || r.animal?.tagNumber} ·{" "}
                  {new Date(r.dueDate).toLocaleDateString()}
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
