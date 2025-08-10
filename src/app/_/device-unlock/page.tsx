"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unlock, hasOfflineIdentity } from "@/lib/auth/offline-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DeviceUnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const exists = await hasOfflineIdentity();
      if (!exists) {
        setError(
          "Este dispositivo no está configurado para acceso offline. Conéctate y realiza la configuración inicial."
        );
        setLoading(false);
        return;
      }
      await unlock(passcode);
      router.replace("/");
    } catch (err: any) {
      setError(err?.message ?? "Error al desbloquear");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent>
            <h1 className="text-xl font-semibold mb-2">Desbloquear dispositivo</h1>
            <p className="text-neutral-600 mb-4">Ingresa tu clave de acceso para trabajar sin Internet.</p>
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
                </div>
              )}
              <Button type="submit" color="primary" isLoading={loading} className="w-full">
                Desbloquear
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
