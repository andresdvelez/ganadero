"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AuthGate } from "./auth-gate";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed", err));
    }
  }, []);

  return (
    <HeroUIProvider navigate={router.push} locale="es-CO">
      <TRPCProvider>
        <AuthGate />
        {children}
      </TRPCProvider>
    </HeroUIProvider>
  );
}
