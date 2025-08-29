import { Suspense } from "react";
import Client from "@/app/_/inventory/page.client.impl";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Cargando…</div>}>
      <Client />
    </Suspense>
  );
}
