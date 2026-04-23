import { RentalDetailScreen } from "@/features/rentals/rental-detail-screen";

export default async function RentalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RentalDetailScreen id={id} />;
}
