"use client";

import { useQuery } from "@tanstack/react-query";
import { getRental } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { rentalStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/error-state";
import { KeyValueGrid } from "@/shared/ui/key-value-grid";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";

export function RentalDetailScreen({ id }: Readonly<{ id: string }>) {
  const rentalQuery = useQuery({
    queryKey: ["rental", id],
    queryFn: () => getRental(id),
  });

  if (rentalQuery.isLoading) {
    return <LoadingScreen label="Rental detail уншиж байна..." />;
  }

  if (rentalQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(rentalQuery.error)}
        onRetry={() => rentalQuery.refetch()}
      />
    );
  }

  const rental = rentalQuery.data;
  if (!rental) {
    return <LoadingScreen label="Rental өгөгдөл хүлээж байна..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Rental Detail"
        title={rental.powerBankSerialNumber}
        description={`${rental.userName} • ${rental.startStationName}`}
      />

      <Card className="space-y-5 rounded-[16px]">
        <Badge tone={statusTone(rental.status)}>{rentalStatusLabels[rental.status]}</Badge>
        <KeyValueGrid
          items={[
            { label: "Rental ID", value: rental.id },
            { label: "User", value: rental.userName },
            { label: "User Phone", value: rental.userPhone || "—" },
            { label: "Power Bank", value: rental.powerBankSerialNumber },
            { label: "Start Station", value: rental.startStationName },
            { label: "End Station", value: rental.endStationName || "—" },
            { label: "Deposit", value: formatMoney(rental.depositAmount) },
            { label: "Charge", value: formatMoney(rental.chargeAmount || 0) },
            { label: "Started", value: formatDateTime(rental.startedAt) },
            { label: "Returned", value: formatDateTime(rental.returnedAt) },
            { label: "Created", value: formatDateTime(rental.createdAt) },
            { label: "Updated", value: formatDateTime(rental.updatedAt) },
          ]}
        />
      </Card>
    </div>
  );
}
