"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Mantener trazas en consola para soporte
    // No exponer stack en UI en producción.
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error);
  }, [error]);

  const details = useMemo(() => {
    const base = `Mensaje: ${error?.message || "Error desconocido"}`;
    const extra =
      process.env.NODE_ENV !== "production" && error?.stack
        ? `\n\nStack:\n${error.stack}`
        : "";
    const digest = error?.digest ? `\n\nDigest: ${error.digest}` : "";
    return `${base}${extra}${digest}`.trim();
  }, [error]);

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <html lang="es">
      <body className="min-h-screen grid place-items-center bg-neutral-50 p-6">
        <Card className="w-full max-w-2xl border-2 border-red-200">
          <CardContent className="p-6">
            <h1 className="text-2xl font-semibold text-red-700 mb-2">
              Ocurrió un error en la aplicación
            </h1>
            <p className="text-neutral-700 mb-4">
              La página encontró un problema y no pudo continuar. Puedes
              reintentar o copiar los detalles para enviarlos al soporte.
            </p>
            <div className="rounded-md bg-red-50 text-red-800 p-4 text-sm whitespace-pre-wrap break-words mb-4">
              {`Mensaje: ${error?.message || "Error desconocido"}`}
            </div>
            {process.env.NODE_ENV !== "production" && error?.stack ? (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-neutral-600">
                  Ver más detalles
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto text-xs bg-neutral-100 p-3 rounded-md">
                  {error.stack}
                </pre>
              </details>
            ) : null}
            <div className="flex gap-3">
              <Button onClick={reset} className="shrink-0">
                Reintentar
              </Button>
              <Button
                variant="secondary"
                onClick={copyDetails}
                className="shrink-0"
              >
                {copied ? "Copiado" : "Copiar detalles"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </body>
    </html>
  );
}
