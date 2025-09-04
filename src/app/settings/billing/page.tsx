"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addToast } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

function BillingInner() {
  const params = useSearchParams();
  const welcome = params.get("welcome");
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = orgs.data?.[0]?.id || "";
  const plans = trpc.billing.listPlans.useQuery(undefined, { enabled: !!orgId });
  const getSub = trpc.billing.getSubscription.useQuery({ orgId }, { enabled: !!orgId });
  const createPref = trpc.billing.createPreference.useMutation();

  const [period, setPeriod] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [qtyUsers, setQtyUsers] = useState<number>(1);
  const [qtyDevices, setQtyDevices] = useState<number>(1);

  useEffect(() => {
    if (welcome) {
      addToast({
        variant: "success",
        title: "¡Bienvenido!",
        description: "Completa tu adquisición de licencia o continúa en modo gratuito.",
      });
    }
  }, [welcome]);

  const onBuy = async () => {
    if (!orgId) return;
    try {
      const pref = await createPref.mutateAsync({ orgId, period, qtyUsers, qtyDevices });
      const url = pref.init_point || pref.sandbox_init_point;
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      addToast({ variant: "error", title: "No se pudo iniciar pago", description: e?.message });
    }
  };

  const onContinueFree = () => {
    addToast({ variant: "info", title: "Plan gratuito activo", description: "Podrás crear hasta 5 animales. Cuando quieras, adquiere tu licencia." });
  };

  const sub = getSub.data?.sub as any;
  const usage = getSub.data?.usage as any;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plan y Facturación</h1>
        <div className="flex gap-2">
          <Button variant="bordered" onPress={onContinueFree}>Continuar gratuitamente</Button>
          <Button color="primary" onPress={onBuy} isLoading={createPref.isPending}>Comprar licencia</Button>
        </div>
      </div>

      {sub ? (
        <Card>
          <CardHeader>
            <CardTitle>Tu suscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">Estado: <b>{sub.status}</b></div>
            <div className="text-sm">Periodo: {sub.period}</div>
            <div className="text-sm">Usuarios: {sub.qtyUsers} · Dispositivos: {sub.qtyDevices}</div>
            {usage && (
              <div className="text-sm text-neutral-700">Uso: animales {usage.animals} · usuarios {usage.users} · dispositivos {usage.devices}</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Adquirir licencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border p-3">
              <div className="font-medium">Periodo</div>
              <div className="mt-2 flex gap-2">
                <Button variant={period === "MONTHLY" ? "flat" : "bordered"} onPress={() => setPeriod("MONTHLY")}>Mensual</Button>
                <Button variant={period === "ANNUAL" ? "flat" : "bordered"} onPress={() => setPeriod("ANNUAL")}>Anual (-10%)</Button>
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="font-medium">Usuarios incluidos</div>
              <div className="mt-2 flex items-center gap-2">
                <Input type="number" min={1} value={String(qtyUsers)} onChange={(e: any) => setQtyUsers(Math.max(1, Number((e.target as HTMLInputElement).value)||1))} />
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="font-medium">Dispositivos incluidos</div>
              <div className="mt-2 flex items-center gap-2">
                <Input type="number" min={1} value={String(qtyDevices)} onChange={(e: any) => setQtyDevices(Math.max(1, Number((e.target as HTMLInputElement).value)||1))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="bordered" onPress={onContinueFree}>Continuar gratuitamente</Button>
            <Button color="primary" onPress={onBuy} isLoading={createPref.isPending}>Pagar con Mercado Pago</Button>
          </div>
          <div className="text-xs text-neutral-600">El plan gratuito permite hasta 5 animales. La licencia elimina límites y habilita invitaciones según usuarios adquiridos y vinculación de dispositivos.</div>
        </CardContent>
      </Card>

      <div className="text-xs text-neutral-500">
        Si ya realizaste el pago y no ves tu plan activo, espera unos segundos o recarga esta página.
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto p-6">Cargando facturación…</div>}>
      <BillingInner />
    </Suspense>
  );
}


