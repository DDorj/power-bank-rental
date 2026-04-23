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
import { getUsers } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { kycStatusLabels, statusTone } from "@/shared/lib/status";
import type { AdminUserListItem } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

const limit = 10;

export function UsersScreen() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | "user" | "admin">("");
  const deferredQuery = useDeferredValue(query);

  const usersQuery = useQuery({
    queryKey: ["users", page, deferredQuery, role],
    queryFn: () =>
      getUsers({
        page,
        limit,
        query: deferredQuery || undefined,
        role: role || undefined,
      }),
  });

  const columns: ColumnDef<AdminUserListItem>[] = [
    {
      header: "User",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={`/users/${row.original.id}`}
            className="font-semibold text-[var(--accent)]"
          >
            {row.original.name}
          </Link>
          <p className="text-xs text-[var(--muted)]">
            {row.original.phone || row.original.email || "contactгүй"}
          </p>
        </div>
      ),
    },
    {
      header: "Role",
      cell: ({ row }) => (
        <div className="space-y-2">
          <Badge tone={row.original.role === "admin" ? "accent" : "neutral"}>
            {row.original.role}
          </Badge>
          <Badge tone={statusTone(row.original.kycStatus)}>
            {kycStatusLabels[row.original.kycStatus]}
          </Badge>
        </div>
      ),
    },
    {
      header: "Wallet",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-semibold">{formatMoney(row.original.walletBalance)}</p>
          <p className="text-xs text-[var(--muted)]">
            frozen {formatMoney(row.original.walletFrozenAmount)}
          </p>
        </div>
      ),
    },
    {
      header: "Activity",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge tone={statusTone(row.original.isActive)}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
          <p className="text-xs text-[var(--muted)]">
            active rentals {row.original.activeRentalCount}
          </p>
        </div>
      ),
    },
    {
      header: "Created",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
  ];

  if (usersQuery.isLoading) {
    return <LoadingScreen label="Users уншиж байна..." />;
  }

  if (usersQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(usersQuery.error)}
        onRetry={() => usersQuery.refetch()}
      />
    );
  }

  const users = usersQuery.data;
  if (!users) {
    return <LoadingScreen label="Users өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Monitoring"
        title="Users"
        description="Search, pagination, role filter болон user detail route-тай хэрэглэгчийн хэсэг."
      />

      <Card className="space-y-4 rounded-[16px]">
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <Input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                setPage(1);
                setQuery(value);
              });
            }}
            placeholder="Нэр, утас, email хайх"
          />
          <Select
            value={role || "all"}
            onValueChange={(value) => {
              startTransition(() => {
                setPage(1);
                setRole(value === "all" ? "" : (value as "user" | "admin"));
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Бүх role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх role</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable data={users.data} columns={columns} />
        <Pagination
          page={page}
          limit={limit}
          total={users.total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
