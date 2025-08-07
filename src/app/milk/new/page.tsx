export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import MilkNewClient from "./page.client.impl";

export default function Page() {
  return <MilkNewClient />;
}
