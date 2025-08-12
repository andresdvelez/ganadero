import { Suspense } from "react";
import Client from "../_/ai-assets/page.client.impl";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Cargando…</div>}>
      <Client />
    </Suspense>
  );
}
