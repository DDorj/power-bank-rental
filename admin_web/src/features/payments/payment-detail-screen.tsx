"use client";

import { useQuery } from "@tanstack/react-query";
import { getPayment } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { paymentPurposeLabels, paymentStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { KeyValueGrid } from "@/shared/ui/key-value-grid";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";

export function PaymentDetailScreen({ id }: Readonly<{ id: string }>) {
  const paymentQuery = useQuery({
    queryKey: ["payment", id],
    queryFn: () => getPayment(id),
  });

  if (paymentQuery.isLoading) {
    return <LoadingScreen label="Payment detail уншиж байна..." />;
  }

  if (paymentQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(paymentQuery.error)}
        onRetry={() => paymentQuery.refetch()}
      />
    );
  }

  const payment = paymentQuery.data;
  if (!payment) {
    return <LoadingScreen label="Payment өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Payment Detail"
        title={payment.invoiceId}
        description={`${payment.userName} • ${formatMoney(payment.amount)}`}
      />

      <Card className="space-y-5 rounded-[16px]">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{paymentPurposeLabels[payment.purpose]}</Badge>
          <Badge tone={statusTone(payment.status)}>
            {paymentStatusLabels[payment.status]}
          </Badge>
        </div>

        <KeyValueGrid
          items={[
            { label: "Payment ID", value: payment.id },
            { label: "User", value: payment.userName },
            { label: "User Phone", value: payment.userPhone || "—" },
            { label: "Transaction ID", value: payment.transactionId },
            { label: "Invoice ID", value: payment.invoiceId },
            { label: "Amount", value: formatMoney(payment.amount) },
            { label: "Follow-up Link", value: payment.followUpLink },
            { label: "Paid At", value: formatDateTime(payment.paidAt) },
            { label: "Expires", value: formatDateTime(payment.expiresAt) },
            { label: "Gateway Txn", value: payment.paymentTransactionId || "—" },
            { label: "Created", value: formatDateTime(payment.createdAt) },
            { label: "Updated", value: formatDateTime(payment.updatedAt) },
          ]}
        />
      </Card>

      <Card className="rounded-[16px]">
        <h2 className="mb-4 text-xl font-bold">Webhook Events</h2>
        <DataTable
          data={payment.webhookEvents}
          columns={[
            { header: "Event", accessorKey: "eventType" },
            { header: "Transaction", accessorKey: "transactionId" },
            {
              header: "Received",
              cell: ({ row }) => formatDateTime(row.original.receivedAt),
            },
            {
              header: "Processed",
              cell: ({ row }) => formatDateTime(row.original.processedAt),
            },
          ]}
          emptyTitle="Webhook event алга"
          emptyDescription="Энэ payment дээр webhook бүртгэгдээгүй байна."
        />
      </Card>
    </div>
  );
}
