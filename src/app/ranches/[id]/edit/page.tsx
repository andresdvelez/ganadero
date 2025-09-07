import { RanchFormContainer } from "@/components/ranches/RanchFormContainer";

interface RanchEditPageProps {
  params: { id: string };
}

export default function RanchEditPage({ params }: RanchEditPageProps) {
  return <RanchFormContainer ranchId={params.id} />;
}