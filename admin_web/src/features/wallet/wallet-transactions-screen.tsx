"use client";

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
import { getWalletTransactions } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { walletTypeLabels } from "@/shared/lib/status";
import type { AdminWalletTransaction, WalletTransactionType } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

const limit = 12;

export function WalletTransactionsScreen() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"" | WalletTransactionType>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const deferredQuery = useDeferredValue(query);

  const walletQuery = useQuery({
    queryKey: ["wallet-transactions", page, deferredQuery, type, dateFrom, dateTo],
    queryFn: () =>
      getWalletTransactions({
        page,
        limit,
        query: deferredQuery || undefined,
        type: type || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      }),
  });

  const columns: ColumnDef<AdminWalletTransaction>[] = [
    {
      header: "User",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-semibold">{row.original.userName}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.userPhone || "—"}</p>
        </div>
      ),
    },
    {
      header: "Type",
      cell: ({ row }) => <Badge tone="accent">{walletTypeLabels[row.original.type]}</Badge>,
    },
    {
      header: "Amounts",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">
            {formatMoney(row.original.amount)}
          </p>
          <p>balance {formatMoney(row.original.balanceAfter)}</p>
          <p>frozen {formatMoney(row.original.frozenAfter)}</p>
        </div>
      ),
    },
    {
      header: "Reference",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p>{row.original.referenceId || "—"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.description || "—"}</p>
        </div>
      ),
    },
    {
      header: "Created",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
  ];

  if (walletQuery.isLoading) {
    return <LoadingScreen label="Wallet transactions уншиж байна..." />;
  }

  if (walletQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(walletQuery.error)}
        onRetry={() => walletQuery.refetch()}
      />
    );
  }

  const walletTransactions = walletQuery.data;
  if (!walletTransactions) {
    return <LoadingScreen label="Wallet өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Transactions"
        title="Wallet Transactions"
        description="Type, date, user query шүүлтүүрээр wallet audit хийх хэсэг."
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
            placeholder="User эсвэл reference хайх"
          />
          <Select
            value={type || "all"}
            onValueChange={(value) => {
              startTransition(() => {
                setPage(1);
                setType(value === "all" ? "" : (value as WalletTransactionType));
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Бүх type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх type</SelectItem>
              <SelectItem value="topup">Topup</SelectItem>
              <SelectItem value="freeze">Freeze</SelectItem>
              <SelectItem value="unfreeze">Unfreeze</SelectItem>
              <SelectItem value="charge">Charge</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>

        <DataTable data={walletTransactions.data} columns={columns} />
        <Pagination
          page={page}
          limit={limit}
          total={walletTransactions.total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
