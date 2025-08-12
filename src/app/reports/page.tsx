"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const { data: milk = [] } = trpc.milk.list.useQuery({ limit: 30 });
  const { data: health = [] } = trpc.health.list.useQuery({ limit: 30 });
  // breeding not exposed yet via router; placeholder counts via health/milk proxies
  const milkTotal = milk.reduce(
    (acc: number, r: any) => acc + (r.liters || 0),
    0
  );

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
              <CardTitle>Producción de leche (últimos 30)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                Total litros: {milkTotal.toLocaleString("es-CO")}
              </div>
              <div className="text-xs text-neutral-500">
                Registros: {milk.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Salud y tratamientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                Registros recientes: {health.length}
              </div>
              <div className="text-xs text-neutral-500">
                Próximamente: próximos vencimientos, costos.
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
          <Card>
            <CardHeader>
              <CardTitle>Potreros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-neutral-500">
                Próximamente: ocupación, rotaciones, aforos.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
