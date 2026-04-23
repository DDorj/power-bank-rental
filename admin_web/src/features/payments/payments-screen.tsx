"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPayments } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/format";
import { paymentPurposeLabels, paymentStatusLabels, statusTone } from "@/shared/lib/status";
import type { AdminPayment, PaymentStatus } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

const limit = 10;

export function PaymentsScreen() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | PaymentStatus>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const deferredQuery = useDeferredValue(query);

  const paymentsQuery = useQuery({
    queryKey: ["payments", page, deferredQuery, status, dateFrom, dateTo],
    queryFn: () =>
      getPayments({
        page,
        limit,
        query: deferredQuery || undefined,
        status: status || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      }),
  });

  const columns: ColumnDef<AdminPayment>[] = [
    {
      header: "Payment",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={`/payments/${row.original.id}`}
            className="font-semibold text-[var(--accent)]"
          >
            {row.original.invoiceId}
          </Link>
          <p className="text-xs text-[var(--muted)]">{row.original.userName}</p>
        </div>
      ),
    },
    {
      header: "Purpose",
      cell: ({ row }) => (
        <div className="space-y-2">
          <Badge tone="accent">{paymentPurposeLabels[row.original.purpose]}</Badge>
          <Badge tone={statusTone(row.original.status)}>
            {paymentStatusLabels[row.original.status]}
          </Badge>
        </div>
      ),
    },
    {
      header: "Amount",
      cell: ({ row }) => formatMoney(row.original.amount),
    },
    {
      header: "Paid / Expires",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--muted)]">
          <p>Paid: {formatDateTime(row.original.paidAt)}</p>
          <p>Expires: {formatDateTime(row.original.expiresAt)}</p>
        </div>
      ),
    },
    {
      header: "Created",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
  ];

  if (paymentsQuery.isLoading) {
    return <LoadingScreen label="Payments уншиж байна..." />;
  }

  if (paymentsQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(paymentsQuery.error)}
        onRetry={() => paymentsQuery.refetch()}
      />
    );
  }

  const payments = paymentsQuery.data;
  if (!payments) {
    return <LoadingScreen label="Payments өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Transactions"
        title="Payments"
        description="Status болон огнооны шүүлтүүртэй payment audit хэсэг."
      />

      <Card className="space-y-4 rounded-[16px]">
        <div className="grid gap-3 xl:grid-cols-[1fr_220px_180px_180px]">
          <Input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                setPage(1);
                setQuery(value);
              });
            }}
            placeholder="Invoice, transaction, user хайх"
          />
          <Select
            value={status || "all"}
            onValueChange={(value) => {
              startTransition(() => {
                setPage(1);
                setStatus(value === "all" ? "" : (value as PaymentStatus));
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Бүх status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>

        {(dateFrom || dateTo) ? (
          <p className="text-sm text-[var(--muted)]">
            Range: {formatDate(dateFrom || null)} - {formatDate(dateTo || null)}
          </p>
        ) : null}

        <DataTable data={payments.data} columns={columns} />
        <Pagination
          page={page}
          limit={limit}
          total={payments.total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
