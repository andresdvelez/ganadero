"use client";

import { useEffect, useState } from "react";
import { SignIn } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AuthSignInPage() {
  const [online, setOnline] = useState(true);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine !== false);
    const h = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", h);
    window.addEventListener("offline", h);
    return () => {
      window.removeEventListener("online", h);
      window.removeEventListener("offline", h);
    };
  }, []);

  if (online) return <SignIn />;

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Acceso sin conexión</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Ingresa tu passcode para continuar usando la app sin internet.
        </p>
        <Input
          aria-label="Passcode"
          placeholder="Código de acceso"
          value={code}
          onChange={(e: any) => setCode(e.target.value)}
        />
        <Button className="w-full mt-4">Entrar</Button>
      </div>
    </div>
  );
}
