import { RanchDashboard } from "@/components/ranches/RanchDashboard";

interface RanchDetailPageProps {
  params: { id: string };
}

export default function RanchDetailPage({ params }: RanchDetailPageProps) {
  return <RanchDashboard ranchId={params.id} />;
}