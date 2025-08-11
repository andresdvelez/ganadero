"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfflinePage() {
  const reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sin conexión</h1>
        <p className="text-neutral-600">
          No detectamos Internet y este dispositivo aún no está configurado para
          acceso offline. Puedes volver a intentarlo o configurar tu passcode y
          vincular el dispositivo cuando tengas conexión.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reload}>Reintentar</Button>
          <Button asChild variant="outline">
            <Link href="/_/download">Configurar dispositivo</Link>
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Si ya configuraste el passcode en este equipo, usa
          <span className="font-semibold"> “Desbloquear dispositivo”</span>.
        </p>
        <div>
          <Button asChild variant="ghost">
            <Link href="/_/device-unlock">Desbloquear dispositivo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
