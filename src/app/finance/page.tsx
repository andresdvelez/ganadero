import { Suspense } from "react";
import FinancePageClient from "@/app/_/finance/page.client.impl";

export const dynamic = "force-dynamic";

export default function FinancePage() {
  return (
    <Suspense>
      <FinancePageClient />
    </Suspense>
  );
}
