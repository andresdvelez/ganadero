import dynamic from "next/dynamic";

const Client = dynamic(() => import("../_/ai-assets/page.client.impl"), {
  ssr: false,
});

export default function Page() {
  return <Client />;
}
