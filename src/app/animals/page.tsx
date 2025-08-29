import { Suspense } from "react";
import AnimalsClient from "@/app/_/_client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <AnimalsClient />
    </Suspense>
  );
}
