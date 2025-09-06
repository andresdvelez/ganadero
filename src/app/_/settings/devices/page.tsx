"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addToast } from "@/components/ui/toast";
import { robustDeviceId } from "@/lib/utils";
import { unlinkLocalDeviceWithPasscode } from "@/lib/auth/offline-auth";
import { useState } from "react";

export default function DevicesSettingsPage() {
  const { data: devices, refetch } = trpc.device.myDevices.useQuery();
  const rebind = trpc.device.rebind.useMutation();
  const unlink = trpc.device.unlinkWithPasscode.useMutation();

  const [targetEmail, setTargetEmail] = useState("");
  const [targetOrgId, setTargetOrgId] = useState("");
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [unlinkPass, setUnlinkPass] = useState("");
  const currentDeviceId = robustDeviceId();

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
                      <Button
                        variant="flat"
                        onPress={() => {
                          setUnlinkingId(d.deviceId);
                          setUnlinkPass("");
                        }}
                      >
                        Desvincular
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

              {unlinkingId && (
                <div className="mt-3 rounded-lg border p-3 bg-neutral-50">
                  <div className="text-sm font-medium mb-2">
                    Desvincular dispositivo
                  </div>
                  <p className="text-xs text-neutral-600 mb-2">
                    Para confirmar, escribe la clave local del dispositivo. Si
                    estás en este mismo equipo, también se eliminará el vínculo
                    local.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="password"
                      placeholder="Clave del dispositivo"
                      value={unlinkPass}
                      onChange={(e: any) => setUnlinkPass(e.target.value)}
                      className="w-52"
                    />
                    <Button
                      variant="flat"
                      onPress={() => {
                        setUnlinkingId(null);
                        setUnlinkPass("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      color="danger"
                      isLoading={unlink.isPending}
                      onPress={async () => {
                        try {
                          if ((unlinkPass || "").length < 6) {
                            addToast({
                              variant: "warning",
                              title: "Clave inválida",
                            });
                            return;
                          }
                          if (unlinkingId === currentDeviceId) {
                            try {
                              await unlinkLocalDeviceWithPasscode({
                                deviceId: unlinkingId,
                                passcode: unlinkPass,
                              });
                            } catch {}
                          }
                          await unlink.mutateAsync({
                            deviceId: unlinkingId,
                            passcode: unlinkPass,
                          });
                          addToast({
                            variant: "success",
                            title: "Dispositivo desvinculado",
                          });
                          setUnlinkingId(null);
                          setUnlinkPass("");
                          refetch();
                        } catch (e: any) {
                          addToast({
                            variant: "error",
                            title: "No se pudo desvincular",
                            description: e?.message,
                          });
                        }
                      }}
                    >
                      Confirmar desvinculación
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
