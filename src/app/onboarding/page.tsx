"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  provisionFromClerk,
  hasOfflineIdentity,
  bindDeviceLocally,
} from "@/lib/auth/offline-auth";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const utils = trpc.useUtils();

  const { data: orgs } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled: isLoaded,
  });

  const isAdmin = useMemo(() => {
    if (!orgs) return false;
    return orgs.some((o) => o.role === "ADMIN");
  }, [orgs]);

  useEffect(() => {
    if (!isLoaded) return;
    if (orgs && !isAdmin) {
      router.replace("/");
    }
  }, [isLoaded, orgs, isAdmin, router]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <OrgStep
          isAdmin={isAdmin}
          onCreated={() => utils.org.myOrganizations.invalidate()}
        />
        {isAdmin && <InviteMembersStep />}
        {isAdmin && <OfflinePasscodeStep />}
        <DesktopAppSuggestion />
      </div>
    </div>
  );
}

function OrgStep({
  isAdmin,
  onCreated,
}: {
  isAdmin: boolean;
  onCreated: () => void;
}) {
  const { data: orgs } = trpc.org.myOrganizations.useQuery();
  const createOrg = trpc.org.createOrganization.useMutation();
  const [name, setName] = useState("");

  if (!isAdmin && orgs && orgs.length > 0) return null;
  const hasOrg = orgs && orgs.length > 0;

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

function InviteMembersStep() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  const { data: orgs } = trpc.org.myOrganizations.useQuery();
  const addMember = trpc.org.addMemberWithPasscode.useMutation();

  useEffect(() => {
    if (orgs && orgs.length > 0) setOrgId(orgs[0].id);
  }, [orgs]);

  if (!orgId) return null;

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">
          2) Invitar miembros (opcional)
        </h2>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await addMember.mutateAsync({
              orgId,
              email,
              name: fullName,
              role: "MEMBER",
              passcode,
            });
            setEmail("");
            setFullName("");
            setPasscode("");
          }}
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Nombre"
            value={fullName}
            onChange={(e: any) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Passcode offline"
            type="password"
            value={passcode}
            onChange={(e: any) => setPasscode(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              color="primary"
              isLoading={addMember.isPending}
            >
              Añadir miembro
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function OfflinePasscodeStep() {
  const { user } = useUser();
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (await hasOfflineIdentity()) setDone(true);
    })();
  }, []);

  if (done) return null;

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">
          3) Acceso offline (passcode personal)
        </h2>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            if (passcode.length < 6 || passcode !== confirm) return;
            await provisionFromClerk({
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName ?? undefined,
              avatarUrl: user.imageUrl,
              passcode,
            });
            setDone(true);
          }}
        >
          <Input
            label="Passcode"
            type="password"
            value={passcode}
            onChange={(e: any) => setPasscode(e.target.value)}
            required
          />
          <Input
            label="Confirmar passcode"
            type="password"
            value={confirm}
            onChange={(e: any) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" color="primary">
            Guardar passcode
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DesktopAppSuggestion() {
  const { user } = useUser();
  const registerDevice = trpc.device.register.useMutation();
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isDesktop =
      /macintosh|windows|linux/.test(ua) &&
      !/mobile|android|iphone|ipad/.test(ua);
    setDetected(isDesktop);
  }, []);

  if (!detected) return null;

  const deviceId = (() => {
    const { robustDeviceId } = require("@/lib/utils");
    return robustDeviceId();
  })();

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">
          4) Descarga la app de escritorio (recomendado)
        </h2>
        <p className="text-neutral-600 mb-3">
          Usa la herramienta sin Internet y con IA local.
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/_/download" target="_blank" rel="noreferrer">
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
