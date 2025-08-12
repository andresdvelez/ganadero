import { Suspense } from "react";
import HealthClient from "@/app/_/health/page.client.impl";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Cargando…</div>}>
      <HealthClient />
    </Suspense>
  );
}
