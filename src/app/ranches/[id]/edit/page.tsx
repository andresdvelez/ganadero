import { RanchFormContainer } from "@/components/ranches/RanchFormContainer";

interface RanchEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function RanchEditPage({ params }: RanchEditPageProps) {
  const { id } = await params;
  return <RanchFormContainer ranchId={id} />;
}