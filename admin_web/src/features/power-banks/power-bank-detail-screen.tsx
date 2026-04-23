"use client";

import { useQuery } from "@tanstack/react-query";
import { getPowerBank } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatPercent } from "@/shared/lib/format";
import { powerBankStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/error-state";
import { KeyValueGrid } from "@/shared/ui/key-value-grid";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";

export function PowerBankDetailScreen({ id }: Readonly<{ id: string }>) {
  const powerBankQuery = useQuery({
    queryKey: ["power-bank", id],
    queryFn: () => getPowerBank(id),
  });

  if (powerBankQuery.isLoading) {
    return <LoadingScreen label="Power bank detail уншиж байна..." />;
  }

  if (powerBankQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(powerBankQuery.error)}
        onRetry={() => powerBankQuery.refetch()}
      />
    );
  }

  const powerBank = powerBankQuery.data;
  if (!powerBank) {
    return <LoadingScreen label="Power bank өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Power Bank Detail"
        title={powerBank.serialNumber}
        description={powerBank.stationName || "Station холболтгүй"}
      />

      <Card className="space-y-5 rounded-[16px]">
        <Badge tone={statusTone(powerBank.status)}>
          {powerBankStatusLabels[powerBank.status]}
        </Badge>

        <KeyValueGrid
          items={[
            { label: "Power Bank ID", value: powerBank.id },
            { label: "Serial", value: powerBank.serialNumber },
            { label: "Charge Level", value: formatPercent(powerBank.chargeLevel) },
            { label: "Station", value: powerBank.stationName || "—" },
            { label: "Station ID", value: powerBank.stationId || "—" },
            { label: "Slot Index", value: powerBank.slotIndex ?? "—" },
            { label: "Slot ID", value: powerBank.slotId || "—" },
            { label: "Created", value: formatDateTime(powerBank.createdAt) },
            { label: "Updated", value: formatDateTime(powerBank.updatedAt) },
          ]}
        />
      </Card>
    </div>
  );
}
