import { Suspense } from "react";
import WeightsPageClient from "@/app/_/weights/page.client.impl";

export const dynamic = "force-dynamic";

export default function WeightsPage() {
  return (
    <Suspense>
      <WeightsPageClient />
    </Suspense>
  );
}
