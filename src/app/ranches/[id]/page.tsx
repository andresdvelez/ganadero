import { RanchDashboard } from "@/components/ranches/RanchDashboard";

interface RanchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RanchDetailPage({ params }: RanchDetailPageProps) {
  const { id } = await params;
  return <RanchDashboard ranchId={id} />;
}