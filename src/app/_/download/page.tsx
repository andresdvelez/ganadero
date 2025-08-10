"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { bindDeviceLocally } from "@/lib/auth/offline-auth";

export default function DownloadPage() {
  const { user } = useUser();
  const registerDevice = trpc.device.register.useMutation();

  const deviceId = (() => {
    if (typeof window === "undefined") return "";
    const { robustDeviceId } = require("@/lib/utils");
    return robustDeviceId();
  })();

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

  return (
    <TRPCProvider>
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
                  Asocia este equipo a tu cuenta para desbloqueo offline con tu
                  passcode.
                </p>
                <Button
                  isLoading={registerDevice.isPending}
                  onPress={async () => {
                    if (!user) return;
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
                  }}
                >
                  Vincular ahora
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}
