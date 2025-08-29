import { Suspense } from "react";
import BreedingClient from "@/app/_/breeding/page.client.impl";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Cargando…</div>}>
      <BreedingClient />
    </Suspense>
  );
}
