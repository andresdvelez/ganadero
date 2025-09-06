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

  const { summary, location, full } = useMemo(() => {
    const message = error?.message || "Error desconocido";
    const stack = error?.stack || "";
    const lines = stack.split(/\n+/);
    let loc: string | null = null;
    for (const ln of lines) {
      const m = ln.match(/src\/(.*?):(\d+):(\d+)/);
      if (m) {
        loc = `${m[0]}`;
        break;
      }
      const w = ln.match(
        /\((?:webpack-internal:\/\/)?[^)]*?src\/(.*?):(\d+):(\d+)\)/
      );
      if (w) {
        loc = `${w[1]}:${w[2]}:${w[3]}`;
        break;
      }
    }
    const digest = error?.digest ? `Digest: ${error.digest}` : "";
    const full = `${message}${loc ? `\nUbicación: ${loc}` : ""}${
      digest ? `\n${digest}` : ""
    }${
      process.env.NODE_ENV !== "production" && stack
        ? `\n\nStack:\n${stack}`
        : ""
    }`.trim();
    return { summary: message, location: loc, full };
  }, [error]);

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function repairAndReload() {
    try {
      // Limpiar caches y SW, luego recargar
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      try {
        await navigator.serviceWorker
          ?.getRegistrations()
          .then((rs) => Promise.all(rs.map((r) => r.unregister())));
      } catch {}
      try {
        localStorage.removeItem("NEXT_CACHE");
      } catch {}
    } finally {
      try {
        window.location.reload();
      } catch {}
    }
  }

  // Auto-reparar cuando sea un error de carga de chunks
  useEffect(() => {
    if (typeof summary === "string" && /Loading chunk|ChunkLoadError/i.test(summary)) {
      // Ejecutar reparación sin esperar interacción del usuario
      repairAndReload();
    }
  }, [summary]);

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
            <div className="rounded-md bg-red-50 text-red-800 p-4 text-sm whitespace-pre-wrap break-words mb-2">
              {`Mensaje: ${summary}`}
            </div>
            {location ? (
              <div className="text-xs text-neutral-600 mb-3">
                Ubicación: {location}
              </div>
            ) : null}
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
              {String(summary || "").includes("Loading chunk") && (
                <Button
                  onClick={repairAndReload}
                  color="danger"
                  className="shrink-0"
                >
                  Reparar y recargar
                </Button>
              )}
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
