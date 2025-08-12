import { Suspense } from "react";
import NextDynamic from "next/dynamic";

export const dynamic = "force-dynamic" as const;

const FinancePageClient = NextDynamic(
  () => import("@/app/_/finance/page.client.impl"),
  {
    ssr: false,
  }
);

export default function FinancePage() {
  return (
    <Suspense>
      <FinancePageClient />
    </Suspense>
  );
}
