"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AIOrb, AIOrbState } from "@/components/ai/ai-orb";
import { ModuleGrid } from "@/components/modules/module-grid";
import { AIDock } from "@/components/ai/ai-dock";
import { moduleRegistry } from "@/modules";

export default function HomePage() {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  });

  const [state, setState] = useState<AIOrbState>("idle");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const modules = useMemo(
    () => Object.values(moduleRegistry).map((m) => ({ id: m.id, name: m.name, href: `/${m.id}` })),
    []
  );

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] relative bg-gradient-mesh">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-28">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-dark">{greeting}</h1>
              <p className="text-text-secondary">Tu asistente está listo para ayudarte</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              En línea
            </div>
          </div>

          {/* Grid iOS de módulos alrededor del orbe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ModuleGrid modules={modules} onSelect={setSelectedModule} />
            </div>
            <div className="flex items-center justify-center">
              <AIOrb state={state} onMicToggle={() => setState((s) => (s === "listening" ? "idle" : "listening"))} />
            </div>
          </div>
        </div>

        <AIDock
          onMic={() => setState((s) => (s === "listening" ? "idle" : "listening"))}
          onSend={(value) => {
            // aquí podemos enrutar al chat o ejecutar acciones
            if (value?.toLowerCase().includes("animal")) setSelectedModule("animals");
            setState("responding");
            setTimeout(() => setState("idle"), 1400);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
