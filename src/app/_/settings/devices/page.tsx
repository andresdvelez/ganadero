"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function DevicesSettingsPage() {
  const { data: devices, refetch } = trpc.device.myDevices.useQuery();
  const rebind = trpc.device.rebind.useMutation();

  const [targetEmail, setTargetEmail] = useState("");
  const [targetOrgId, setTargetOrgId] = useState("");

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardContent>
              <h1 className="text-2xl font-semibold mb-2">
                Dispositivos vinculados
              </h1>
              <p className="text-neutral-600 mb-4">
                Gestiona tus dispositivos. Solo una cuenta por dispositivo a la
                vez.
              </p>
              <div className="space-y-3">
                {devices?.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{d.name || d.deviceId}</div>
                      <div className="text-sm text-neutral-600">
                        {d.platform || ""}
                      </div>
                      {d.orgId && (
                        <div className="text-xs text-neutral-500 mt-1">
                          org: {d.orgId}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="email destino"
                        value={targetEmail}
                        onChange={(e: any) => setTargetEmail(e.target.value)}
                        className="w-48"
                      />
                      <Input
                        placeholder="orgId (opcional)"
                        value={targetOrgId}
                        onChange={(e: any) => setTargetOrgId(e.target.value)}
                        className="w-40"
                      />
                      <Button
                        isLoading={rebind.isPending}
                        onPress={async () => {
                          await rebind.mutateAsync({
                            deviceId: d.deviceId,
                            targetUserEmail: targetEmail,
                            targetOrgId,
                          });
                          setTargetEmail("");
                          setTargetOrgId("");
                          refetch();
                        }}
                      >
                        Reasignar
                      </Button>
                    </div>
                  </div>
                ))}
                {devices?.length === 0 && (
                  <p className="text-neutral-600">
                    No hay dispositivos registrados.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
