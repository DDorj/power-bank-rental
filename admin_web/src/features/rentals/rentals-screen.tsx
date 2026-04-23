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
import { getRentals } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { rentalStatusLabels, statusTone } from "@/shared/lib/status";
import type { AdminRental, RentalStatus } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

const limit = 10;

export function RentalsScreen() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | RentalStatus>("");
  const deferredQuery = useDeferredValue(query);

  const rentalsQuery = useQuery({
    queryKey: ["rentals", page, deferredQuery, status],
    queryFn: () =>
      getRentals({
        page,
        limit,
        query: deferredQuery || undefined,
        status: status || undefined,
      }),
  });

  const columns: ColumnDef<AdminRental>[] = [
    {
      header: "Rental",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={`/rentals/${row.original.id}`}
            className="font-semibold text-[var(--accent)]"
          >
            {row.original.powerBankSerialNumber}
          </Link>
          <p className="text-xs text-[var(--muted)]">{row.original.userName}</p>
        </div>
      ),
    },
    {
      header: "Route",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--muted)]">
          <p>{row.original.startStationName}</p>
          <p>{row.original.endStationName || "Буцаагдаагүй"}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge tone={statusTone(row.original.status)}>
          {rentalStatusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      header: "Amount",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-semibold">{formatMoney(row.original.depositAmount)}</p>
          <p className="text-xs text-[var(--muted)]">
            charge {formatMoney(row.original.chargeAmount || 0)}
          </p>
        </div>
      ),
    },
    {
      header: "Started",
      cell: ({ row }) => formatDateTime(row.original.startedAt),
    },
  ];

  if (rentalsQuery.isLoading) {
    return <LoadingScreen label="Rentals уншиж байна..." />;
  }

  if (rentalsQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(rentalsQuery.error)}
        onRetry={() => rentalsQuery.refetch()}
      />
    );
  }

  const rentals = rentalsQuery.data;
  if (!rentals) {
    return <LoadingScreen label="Rentals өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Monitoring"
        title="Rentals"
        description="Status filter болон detail page холболттой rental monitor."
      />

      <Card className="space-y-4 rounded-[16px]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                setPage(1);
                setQuery(value);
              });
            }}
            placeholder="User, station, serial хайх"
          />
          <Select
            value={status || "all"}
            onValueChange={(value) => {
              startTransition(() => {
                setPage(1);
                setStatus(value === "all" ? "" : (value as RentalStatus));
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Бүх status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable data={rentals.data} columns={columns} />
        <Pagination
          page={page}
          limit={limit}
          total={rentals.total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
