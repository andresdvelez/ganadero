"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedIn, SignedOut } from "@clerk/nextjs";
import {
  provisionFromClerk,
  hasOfflineIdentity,
} from "@/lib/auth/offline-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OfflineSetupPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (await hasOfflineIdentity()) {
        router.replace("/");
      }
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passcode.length < 6) {
      setError("La clave debe tener al menos 6 caracteres");
      return;
    }
    if (passcode !== confirm) {
      setError("Las claves no coinciden");
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await provisionFromClerk({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl,
        orgId: user.organizationMemberships?.[0]?.organization?.id,
        passcode,
      });
      router.replace("/");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo configurar el acceso offline");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <SignedIn>
          <Card>
            <CardContent>
              <h1 className="text-xl font-semibold mb-2">
                Configurar acceso offline
              </h1>
              <p className="text-neutral-600 mb-4">
                Crea una clave local para usar la app sin Internet en este
                dispositivo.
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
                <Input
                  type="password"
                  label="Confirmar clave"
                  placeholder="••••••"
                  value={confirm}
                  onChange={(e: any) => setConfirm(e.target.value)}
                  required
                />
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <Button
                  type="submit"
                  color="primary"
                  isLoading={loading}
                  className="w-full"
                >
                  Guardar clave
                </Button>
              </form>
            </CardContent>
          </Card>
        </SignedIn>
        <SignedOut>
          <Card>
            <CardContent>
              <h1 className="text-xl font-semibold mb-2">Inicia sesión</h1>
              <p className="text-neutral-600 mb-4">
                Debes iniciar sesión para configurar el acceso offline.
              </p>
              <Button onPress={() => router.push("/sign-in")}>
                Ir a iniciar sesión
              </Button>
            </CardContent>
          </Card>
        </SignedOut>
      </div>
    </div>
  );
}
