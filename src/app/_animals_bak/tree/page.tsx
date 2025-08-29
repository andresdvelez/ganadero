"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

function TreeNode({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <div
      className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs cursor-pointer hover:bg-neutral-200"
      onClick={onClick}
    >
      {label}
    </div>
  );
}

function TreeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const animalId = params.get("id");
  const { data: node } = trpc.animal.getTree.useQuery(
    { id: animalId || "" },
    { enabled: !!animalId }
  );
  useEffect(() => {
    if (!animalId) router.push("/animals");
  }, [animalId, router]);

  const motherChildren = node?.motherChildren || [];
  const fatherChildren = node?.fatherChildren || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {node?.name || ""} · {node?.tagNumber}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!node ? (
          <div className="text-sm text-neutral-500">
            Selecciona un animal desde el listado para ver su árbol.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-8 mb-4">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-neutral-500 mb-1">Madre</div>
                  <TreeNode
                    label={node.mother?.name || "(desconocida)"}
                    onClick={() =>
                      node.mother?.id &&
                      router.push(`/animals/tree?id=${node.mother.id}`)
                    }
                  />
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xs text-neutral-500 mb-1">Padre</div>
                  <TreeNode
                    label={node.father?.name || "(desconocido)"}
                    onClick={() =>
                      node.father?.id &&
                      router.push(`/animals/tree?id=${node.father.id}`)
                    }
                  />
                </div>
              </div>
              <div className="mb-4">
                <TreeNode label={`${node.name} (${node.sex})`} />
              </div>
              <div className="grid grid-cols-2 gap-6 w-full">
                <div>
                  <div className="text-xs text-neutral-500 mb-2">
                    Hijos (línea materna)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {motherChildren.length === 0 ? (
                      <div className="text-xs text-neutral-400">Sin datos</div>
                    ) : (
                      motherChildren.map((c: any) => (
                        <TreeNode
                          key={c.id}
                          label={c.name}
                          onClick={() =>
                            router.push(`/animals/tree?id=${c.id}`)
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-2">
                    Hijos (línea paterna)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fatherChildren.length === 0 ? (
                      <div className="text-xs text-neutral-400">Sin datos</div>
                    ) : (
                      fatherChildren.map((c: any) => (
                        <TreeNode
                          key={c.id}
                          label={c.name}
                          onClick={() =>
                            router.push(`/animals/tree?id=${c.id}`)
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const dynamic = "force-dynamic";

export default function AnimalTreePage() {
  const router = useRouter();
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Árbol genealógico</h1>
          <div className="flex gap-2">
            <Button variant="bordered" onPress={() => router.push("/animals")}>
              Volver a animales
            </Button>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="text-sm text-neutral-500">Cargando árbol…</div>
          }
        >
          <TreeContent />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
