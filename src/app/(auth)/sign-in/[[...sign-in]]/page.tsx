"use client";

import { useEffect, useState } from "react";
import { SignIn } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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

  if (online)
    return (
      <div className="min-h-screen relative bg-[radial-gradient(1200px_600px_at_50%_-10%,_#ffffff_0%,_#f2f2f2_60%,_#f2f2f2_100%)]">
        {/* Logo se muestra desde el layout del grupo (auth) */}
        <div className="min-h-screen grid place-items-center px-4">
          <div className="w-full max-w-md">
            <SignIn
              signUpUrl="/sign-up"
              appearance={{
                variables: {
                  colorPrimary: "#1c2c24",
                  colorBackground: "#ffffff",
                  colorText: "#1c2c24",
                  colorInputBackground: "#ffffff",
                  borderRadius: "16px",
                },
                elements: {
                  card: "shadow-xl border border-neutral-200 rounded-2xl",
                  headerTitle: "text-[#1c2c24] font-semibold",
                  headerSubtitle: "text-neutral-600",
                  formButtonPrimary:
                    "bg-[#1c2c24] hover:bg-[#1c2c24] focus:ring-[#1c2c24] text-white",
                  formFieldInput: "bg-white",
                  footerAction__signUp: "", // mantener limpio
                },
              }}
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen relative bg-[radial-gradient(1200px_600px_at_50%_-10%,_#ffffff_0%,_#f2f2f2_60%,_#f2f2f2_100%)]">
      {/* Logo provisto por el layout */}
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
          <h1 className="text-xl font-semibold mb-2 text-[#1c2c24]">
            Acceso sin conexión
          </h1>
          <p className="text-sm text-neutral-600 mb-4">
            Ingresa tu passcode para continuar usando la app sin internet.
          </p>
          <Input
            aria-label="Passcode"
            placeholder="Código de acceso"
            value={code}
            onChange={(e: any) => setCode(e.target.value)}
          />
          <Button className="w-full mt-4 bg-[#1c2c24] text-white hover:bg-[#1c2c24]">
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}
