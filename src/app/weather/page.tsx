"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function WeatherPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Clima</h1>
        <Card>
          <CardHeader>
            <CardTitle>Pronóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-neutral-500">
              Próximamente: integración con sensores y API meteorológica.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
