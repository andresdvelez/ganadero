"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const LINKS = [
  {
    href: "/analysis/reproduction",
    title: "Reproducción",
    desc: "KPIs, tendencias y listas de acción",
  },
  {
    href: "/analysis/milk",
    title: "Leche",
    desc: "Litros, CCS y top por animal",
  },
  {
    href: "/analysis/health",
    title: "Salud",
    desc: "Costos por tipo y vencimientos",
  },
  {
    href: "/analysis/inventory",
    title: "Inventario",
    desc: "Rotación, costos y stock bajo",
  },
];

export default function AnalysisIndexPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Paneles de Análisis</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{l.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">{l.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
