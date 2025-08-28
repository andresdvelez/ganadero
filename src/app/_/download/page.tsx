"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import {
  bindDeviceLocally,
  hasOfflineIdentity,
  provisionFromClerk,
} from "@/lib/auth/offline-auth";
import { useMemo, useState } from "react";
import { addToast } from "@/components/ui/toast";
import { robustDeviceId } from "@/lib/utils";

export default function DownloadPage() {
  const { user } = useUser();
  const registerDevice = trpc.device.register.useMutation({
    onError(error) {
      addToast({
        variant: "error",
        title: "No se pudo vincular",
        description: error.message,
      });
    },
    onSuccess() {
      addToast({ variant: "success", title: "Dispositivo vinculado" });
    },
  });
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deviceId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return robustDeviceId();
  }, []);

  const modelUrl =
    process.env.NEXT_PUBLIC_MODEL_DOWNLOAD_URL ||
    "https://huggingface.co/ganado/ollama/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf?download=true";
  const desktopUrl =
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
    "/downloads/ganado-ai-desktop.dmg";
  const desktopWinUrl =
    process.env.NEXT_PUBLIC_DESKTOP_WIN_DOWNLOAD_URL ||
    "/downloads/ganado-ai-desktop.exe";
  const desktopLinuxUrl =
    process.env.NEXT_PUBLIC_DESKTOP_LINUX_DOWNLOAD_URL ||
    "/downloads/ganado-ai-desktop.AppImage";

  const onBind = async () => {
    setError(null);
    if (!user) return;
    const hasId = await hasOfflineIdentity();
    if (!hasId) {
      setShowPasscode(true);
      return;
    }
    await registerDevice.mutateAsync({
      deviceId,
      name: "Este equipo",
      platform: navigator.platform,
    });
    await bindDeviceLocally({
      deviceId,
      clerkId: user.id,
      name: "Este equipo",
      platform: navigator.platform,
    });
  };

  const onSavePasscode = async () => {
    setError(null);
    if (!user) return;
    if (passcode.length < 6 || passcode !== confirm) {
      setError("Passcode inválido o no coincide");
      addToast({
        variant: "warning",
        title: "Revisa tu passcode",
        description: "Debe tener al menos 6 caracteres y coincidir.",
      });
      return;
    }
    try {
      await provisionFromClerk({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl,
        passcode,
      });
      addToast({ variant: "success", title: "Passcode guardado" });
      setShowPasscode(false);
      await onBind();
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "No se pudo guardar el passcode",
        description: e?.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardContent>
              <h1 className="text-2xl font-semibold mb-2">Descargas</h1>
              <p className="text-neutral-600 mb-4">
                Instala la app de escritorio y el modelo de IA local para usar
                la plataforma sin Internet.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Button asChild>
                  <a href={desktopUrl} download>
                    macOS (.dmg)
                  </a>
                </Button>
                <Button asChild>
                  <a href={desktopWinUrl} download>
                    Windows (.exe)
                  </a>
                </Button>
                <Button asChild>
                  <a href={desktopLinuxUrl} download>
                    Linux (.AppImage)
                  </a>
                </Button>
              </div>
              <div className="mt-6">
                <Button asChild color="secondary">
                  <a href={modelUrl}>Descargar modelo IA local</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold mb-2">
                Vincular este dispositivo
              </h2>
              <p className="text-neutral-600 mb-4">
                Asocia este equipo a tu cuenta. Si aún no tienes passcode local,
                te lo pediremos ahora.
              </p>
              <Button isLoading={registerDevice.isPending} onPress={onBind}>
                Vincular ahora
              </Button>

              {showPasscode && (
                <div className="mt-4 space-y-3">
                  <Input
                    type="password"
                    label="Passcode"
                    value={passcode}
                    onChange={(e) =>
                      setPasscode((e.target as HTMLInputElement).value)
                    }
                  />
                  <Input
                    type="password"
                    label="Confirmar passcode"
                    value={confirm}
                    onChange={(e) =>
                      setConfirm((e.target as HTMLInputElement).value)
                    }
                  />
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  <div className="flex gap-2">
                    <Button color="primary" onPress={onSavePasscode}>
                      Guardar y continuar
                    </Button>
                    <Button
                      variant="bordered"
                      onPress={() => setShowPasscode(false)}
                    >
                      Cancelar
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
