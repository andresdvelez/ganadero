"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreedingSync } from "@/components/embedded/breeding-sync";
import { BreedingPalpation } from "@/components/embedded/breeding-palpation";
import { BreedingAbortions } from "@/components/embedded/breeding-abortions";
import { BreedingKPIs } from "@/components/embedded/breeding-kpis";
import { BreedingActionLists } from "@/components/embedded/breeding-action-lists";

export default function BreedingClient() {
  const [tab, setTab] = useState("sync");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Reproducción</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="sync">Sincronización</TabsTrigger>
            <TabsTrigger value="palp">Palpaciones</TabsTrigger>
            <TabsTrigger value="abort">Abortos</TabsTrigger>
            <TabsTrigger value="kpi">KPIs</TabsTrigger>
            <TabsTrigger value="actions">Listas de acción</TabsTrigger>
            <TabsTrigger value="protocols">Protocolos IA/MN/TE</TabsTrigger>
          </TabsList>
          <TabsContent value="sync">
            <BreedingSync />
          </TabsContent>
          <TabsContent value="palp">
            <BreedingPalpation />
          </TabsContent>
          <TabsContent value="abort">
            <BreedingAbortions />
          </TabsContent>
          <TabsContent value="kpi">
            <BreedingKPIs />
          </TabsContent>
          <TabsContent value="actions">
            <BreedingActionLists />
          </TabsContent>
          <TabsContent value="protocols">
            {/* Placeholder: reutilizamos el flujo de sincronización como base de protocolos */}
            <BreedingSync />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
