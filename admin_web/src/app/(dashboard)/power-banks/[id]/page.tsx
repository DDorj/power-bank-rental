import { PowerBankDetailScreen } from "@/features/power-banks/power-bank-detail-screen";

export default async function PowerBankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PowerBankDetailScreen id={id} />;
}
