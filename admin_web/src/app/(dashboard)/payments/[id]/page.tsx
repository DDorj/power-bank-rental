import { PaymentDetailScreen } from "@/features/payments/payment-detail-screen";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentDetailScreen id={id} />;
}
