import Link from "next/link";
import {
  FloatingIslandCard,
  CardBody,
  CardHeader,
} from "@/components/ui/hero-card";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-neutral-50">
      {/* Left informational sidebar */}
      <div className="hidden md:block p-6 sm:p-10">
        <div className="h-full w-full rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-6 sm:p-8 shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Ganado AI — gestión ganadera moderna
            </h2>
            <p className="mt-2 text-white/90 text-sm">
              Diseñado para leche, carne, doble propósito y cría. Fácil, rápido
              y en español.
            </p>
          </div>

          <FloatingIslandCard className="bg-white/10 text-white border-white/20">
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold">Lo que puedes hacer</h3>
            </CardHeader>
            <CardBody className="pt-0 text-sm text-white/90">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Tablero de control con métricas diarias y alertas
                  configurables.
                </li>
                <li>
                  Módulos de Leche, Carne, Reproducción, Salud, Costos y
                  Praderas.
                </li>
                <li>
                  Integración con básculas, lectores RFID y collares de
                  monitoreo.
                </li>
                <li>
                  App móvil con trabajo sin internet y sincronización segura.
                </li>
                <li>
                  Simulaciones “¿qué pasaría si?” para decisiones rentables.
                </li>
                <li>
                  Ranking genético, trazabilidad e informes personalizables.
                </li>
              </ul>
            </CardBody>
          </FloatingIslandCard>

          <FloatingIslandCard className="bg-white/10 text-white border-white/20">
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold">
                Zonas de calor en bovinos (THI/CCI)
              </h3>
            </CardHeader>
            <CardBody className="pt-0 text-sm text-white/90">
              <div className="space-y-2">
                <p className="opacity-95">THI (Temperatura-Humedad):</p>
                <ul className="grid grid-cols-2 gap-2">
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    Leve: 72–77
                  </li>
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    Significativo: 78–86 (Bos taurus)
                  </li>
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    Alto: 87–98 (todas las razas)
                  </li>
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    Severo: ≥99
                  </li>
                </ul>
                <p className="mt-3 opacity-95">
                  CCI (Confort Bovino) orienta sobre estrés por calor/frío.
                </p>
                <p className="text-xs text-white/80 mt-2">
                  Fuente educativa:{" "}
                  <Link
                    className="underline hover:text-white"
                    href="https://nacp.org.au/cattle_thermal_stress_forecasts"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NACP – Cattle Thermal Stress Forecasts
                  </Link>
                  .
                </p>
              </div>
            </CardBody>
          </FloatingIslandCard>

          <FloatingIslandCard className="bg-white/10 text-white border-white/20">
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold">Noticias y avisos</h3>
            </CardHeader>
            <CardBody className="pt-0 text-sm text-white/90 space-y-2">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                Nueva versión de módulos AI con mejoras de sincronización
                offline.
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                Capacitaciones virtuales y guía paso a paso para empezar.
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                Integración con básculas y lectores RFID disponible.
              </div>
            </CardBody>
          </FloatingIslandCard>

          <div className="mt-auto text-xs text-white/80">
            2025 Ganado AI. Todos los derechos reservados.
          </div>
        </div>
      </div>

      {/* Right auth form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-neutral-500">
            Al iniciar sesión aceptas nuestros términos y políticas.
          </p>
        </div>
      </div>
    </div>
  );
}
