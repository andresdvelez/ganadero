"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>KPIs financieros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-neutral-500">
                Próximamente: ingresos vs egresos, margen, cashflow.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Producción de leche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-neutral-500">
                Próximamente: series de tiempo por ordeño.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Salud y tratamientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-neutral-500">
                Próximamente: eventos, próximos vencimientos.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Reproducción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-neutral-500">
                Próximamente: servicios, preñeces, partos.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
