import { RanchFormContainer } from "@/components/ranches/RanchFormContainer";

interface RanchDetailPageProps {
  params: { id: string };
}

export default function RanchDetailPage({ params }: RanchDetailPageProps) {
  return <RanchFormContainer ranchId={params.id} />;
}