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
import { getPowerBanks } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatPercent } from "@/shared/lib/format";
import { powerBankStatusLabels, statusTone } from "@/shared/lib/status";
import type { AdminPowerBank, PowerBankStatus } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

const limit = 12;

export function PowerBanksScreen() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | PowerBankStatus>("");
  const deferredQuery = useDeferredValue(query);

  const powerBanksQuery = useQuery({
    queryKey: ["power-banks", page, deferredQuery, status],
    queryFn: () =>
      getPowerBanks({
        page,
        limit,
        query: deferredQuery || undefined,
        status: status || undefined,
      }),
  });

  const columns: ColumnDef<AdminPowerBank>[] = [
    {
      header: "Power Bank",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={`/power-banks/${row.original.id}`}
            className="font-semibold text-[var(--accent)]"
          >
            {row.original.serialNumber}
          </Link>
          <p className="text-xs text-[var(--muted)]">{row.original.id}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge tone={statusTone(row.original.status)}>
          {powerBankStatusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      header: "Charge",
      cell: ({ row }) => formatPercent(row.original.chargeLevel),
    },
    {
      header: "Location",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--muted)]">
          <p>{row.original.stationName || "Stationгүй"}</p>
          <p>
            slot {row.original.slotIndex ?? "—"} / {row.original.slotId || "slotгүй"}
          </p>
        </div>
      ),
    },
    {
      header: "Updated",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
  ];

  if (powerBanksQuery.isLoading) {
    return <LoadingScreen label="Power banks уншиж байна..." />;
  }

  if (powerBanksQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(powerBanksQuery.error)}
        onRetry={() => powerBanksQuery.refetch()}
      />
    );
  }

  const powerBanks = powerBanksQuery.data;
  if (!powerBanks) {
    return <LoadingScreen label="Power bank өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Monitoring"
        title="Power Banks"
        description="Status filter болон detail route-тай inventory monitor."
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
            placeholder="Serial эсвэл station хайх"
          />
          <Select
            value={status || "all"}
            onValueChange={(value) => {
              startTransition(() => {
                setPage(1);
                setStatus(value === "all" ? "" : (value as PowerBankStatus));
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Бүх status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх status</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="charging">Charging</SelectItem>
              <SelectItem value="faulty">Faulty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable data={powerBanks.data} columns={columns} />
        <Pagination
          page={page}
          limit={limit}
          total={powerBanks.total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
