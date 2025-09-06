"use client";

import { useEffect, useState } from "react";
import { SignUp } from "@clerk/nextjs";

export default function AuthSignUpPage() {
  const [online, setOnline] = useState(true);
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
      <div className="flex items-center justify-center relative">
        <div className=" grid place-items-center px-4">
          <div className="w-full max-w-md">
            <SignUp
              signInUrl="/sign-in"
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
                  footerAction__signIn: "",
                },
              }}
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm text-center">
        <h1 className="text-xl font-semibold mb-2">Sin conexión</h1>
        <p className="text-sm text-neutral-600">
          Para crear una cuenta necesitas conexión a internet. Inténtalo más
          tarde o inicia sesión con passcode si ya tienes acceso.
        </p>
      </div>
    </div>
  );
}
