"use client";

import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { kycStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/error-state";
import { KeyValueGrid } from "@/shared/ui/key-value-grid";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";

export function UserDetailScreen({ id }: Readonly<{ id: string }>) {
  const userQuery = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
  });

  if (userQuery.isLoading) {
    return <LoadingScreen label="User detail уншиж байна..." />;
  }

  if (userQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(userQuery.error)}
        onRetry={() => userQuery.refetch()}
      />
    );
  }

  const user = userQuery.data;
  if (!user) {
    return <LoadingScreen label="User өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="User Detail"
        title={user.name}
        description={user.phone || user.email || user.id}
      />

      <Card className="space-y-5 rounded-[16px]">
        <div className="flex flex-wrap gap-2">
          <Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role}</Badge>
          <Badge tone={statusTone(user.kycStatus)}>
            {kycStatusLabels[user.kycStatus]}
          </Badge>
          <Badge tone={statusTone(user.isActive)}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <KeyValueGrid
          items={[
            { label: "Phone", value: user.phone || "—" },
            { label: "Email", value: user.email || "—" },
            { label: "Trust Tier", value: user.trustTier },
            { label: "Wallet Balance", value: formatMoney(user.walletBalance) },
            { label: "Frozen", value: formatMoney(user.walletFrozenAmount) },
            { label: "Active Rentals", value: user.activeRentalCount },
            { label: "Primary Auth", value: user.primaryAuthMethod },
            { label: "KYC Verified", value: formatDateTime(user.kycVerifiedAt) },
            { label: "Created", value: formatDateTime(user.createdAt) },
            { label: "Updated", value: formatDateTime(user.updatedAt) },
            { label: "User ID", value: user.id },
          ]}
        />
      </Card>
    </div>
  );
}
