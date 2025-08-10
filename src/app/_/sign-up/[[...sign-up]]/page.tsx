"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <TRPCProvider>
      <DashboardLayout>
        <div className="p-6">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent>
                <h1 className="text-2xl font-semibold mb-2">Crear cuenta</h1>
                <p className="text-neutral-600 mb-4">
                  Regístrate para empezar con Ganado AI.
                </p>
                <div className="flex justify-center">
                  <SignUp
                    appearance={{
                      elements: {
                        formButtonPrimary:
                          "bg-pasture-500 hover:bg-pasture-600",
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}
