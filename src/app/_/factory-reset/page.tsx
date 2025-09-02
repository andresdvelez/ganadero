"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";
import { db } from "@/lib/dexie";
import { trpc } from "@/lib/trpc/client";
import { getBoundDevice } from "@/lib/auth/offline-auth";

export default function FactoryResetPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const deleteDevice = trpc.device.delete.useMutation();

  const wipeAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1) Intentar eliminar en backend si hay deviceId local
      try {
        const bound = await getBoundDevice();
        if (bound?.deviceId) {
          await deleteDevice.mutateAsync({ deviceId: bound.deviceId });
        }
      } catch {}

      // 2) Borrar IndexedDB (Dexie)
      try {
        await db.delete();
      } catch {}

      // 3) Borrar storages
      try {
        if (typeof localStorage !== "undefined") localStorage.clear();
      } catch {}
      try {
        if (typeof sessionStorage !== "undefined") sessionStorage.clear();
      } catch {}

      // 4) Borrar caches y desregistrar SW
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      try {
        await navigator.serviceWorker
          ?.getRegistrations()
          .then((rs) => Promise.all(rs.map((r) => r.unregister())));
      } catch {}

      setDone(true);
      addToast({ variant: "success", title: "Equipo desvinculado" });
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "No se pudo limpiar",
        description: e?.message,
      });
    } finally {
      setBusy(false);
      // Forzar recarga total
      try {
        location.replace("/sign-in");
      } catch {}
    }
  };

  useEffect(() => {
    // No auto-ejecutar para evitar borrado accidental
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4">
        <Card>
          <CardContent className="space-y-4 py-6">
            <h1 className="text-xl font-semibold">
              Desvincular y borrar datos
            </h1>
            <p className="text-neutral-700">
              Esta acción eliminará el dispositivo asociado en el servidor (si
              aplica) y borrará todos los datos locales.
            </p>
            <Button isLoading={busy} onPress={wipeAll} color="danger">
              Desvincular este equipo y borrar todo
            </Button>
            {done && <p className="text-success-700">Listo. Reiniciando…</p>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
