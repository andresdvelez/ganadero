"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bindDeviceLocally } from "@/lib/auth/offline-auth";
import { addToast } from "@/components/ui/toast";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const utils = trpc.useUtils();

  const { data: orgs } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled: isLoaded,
  });

  const hasOrg = !!orgs && orgs.length > 0;

  useEffect(() => {
    if (!isLoaded) return;
    if (hasOrg) return; // stay until user links device
  }, [isLoaded, hasOrg]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <OrgStep onCreated={() => utils.org.myOrganizations.invalidate()} />
        {hasOrg && <LinkDeviceStep />}
      </div>
    </div>
  );
}

function OrgStep({ onCreated }: { onCreated: () => void }) {
  const { data: orgs } = trpc.org.myOrganizations.useQuery();
  const createOrg = trpc.org.createOrganization.useMutation({
    onError(error) {
      addToast({
        variant: "error",
        title: "No se pudo crear",
        description: error.message,
      });
    },
    onSuccess() {
      addToast({ variant: "success", title: "Organización creada" });
    },
  });
  const [name, setName] = useState("");

  const hasOrg = !!orgs && orgs.length > 0;

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">1) Crear organización</h2>
        {hasOrg ? (
          <p className="text-neutral-600">Ya perteneces a una organización.</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await createOrg.mutateAsync({ name });
              onCreated();
            }}
          >
            <Input
              label="Nombre de la organización"
              placeholder="Mi finca"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
              required
            />
            <Button
              type="submit"
              color="primary"
              isLoading={createOrg.isPending}
            >
              Crear organización
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function LinkDeviceStep() {
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

  const deviceId = (() => {
    const { robustDeviceId } = require("@/lib/utils");
    return robustDeviceId();
  })();

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">
          2) Vincular dispositivo y descargar app
        </h2>
        <p className="text-neutral-600 mb-3">
          Vincula este equipo para acceso offline y descarga la app de
          escritorio.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button asChild>
            <a href="/download" target="_blank" rel="noreferrer">
              Descargar app
            </a>
          </Button>
          <Button
            color="secondary"
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
            Vincular este dispositivo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
