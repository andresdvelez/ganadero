"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[RouteError]", error);
  }, [error]);

  const { summary, location, full } = useMemo(() => {
    const message = error?.message || "Error desconocido";
    const stack = error?.stack || "";
    let loc: string | null = null;
    for (const ln of stack.split(/\n+/)) {
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

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 p-6">
      <Card className="w-full max-w-2xl border-2 border-red-200">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold text-red-700 mb-2">
            Algo salió mal en esta página
          </h1>
          <p className="text-neutral-700 mb-4">
            Puedes intentar de nuevo o copiar los detalles del error.
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
            <Button onClick={reset}>Reintentar</Button>
            <Button variant="secondary" onClick={copyDetails}>
              {copied ? "Copiado" : "Copiar detalles"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
