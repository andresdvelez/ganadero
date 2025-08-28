"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unlock, hasOfflineIdentity } from "@/lib/auth/offline-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";

export default function DeviceUnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const exists = await hasOfflineIdentity();
      if (!exists) {
        setNeedsSetup(true);
        setError("Este dispositivo no está configurado para acceso offline.");
        addToast({
          variant: "warning",
          title: "Dispositivo sin configurar",
          description:
            "Conéctate a Internet y vincula este equipo desde el menú Offline.",
        });
        setLoading(false);
        return;
      }
      await unlock(passcode);
      addToast({ variant: "success", title: "Dispositivo desbloqueado" });
      router.replace("/");
    } catch (err: any) {
      setError(err?.message ?? "Error al desbloquear");
      addToast({
        variant: "error",
        title: "Error al desbloquear",
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent>
            <h1 className="text-xl font-semibold mb-2">
              Desbloquear dispositivo
            </h1>
            <p className="text-neutral-600 mb-4">
              Ingresa tu clave de acceso para trabajar sin Internet.
            </p>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                type="password"
                label="Clave de acceso"
                placeholder="••••••"
                value={passcode}
                onChange={(e: any) => setPasscode(e.target.value)}
                required
              />
              {error && (
                <div className="text-red-600 text-sm" role="alert">
                  {error}
                  {needsSetup && (
                    <div className="mt-2 text-neutral-700">
                      Conéctate a Internet y, en el menú superior, abre <b>Offline</b> → <b>Vincular este equipo</b> para crear tu clave local.
                      También puedes ir a <a className="underline" href="/download" target="_blank" rel="noreferrer">Descargar app</a> y seguir el asistente.
                    </div>
                  )}
                </div>
              )}
              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                className="w-full"
              >
                Desbloquear
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
