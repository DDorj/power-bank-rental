"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPinned } from "lucide-react";
import {
  getActiveRental,
  getReturnStations,
  getStation,
  returnRentalAutoSelect,
  toReceiptSnapshot,
} from "@/shared/api/customer";
import { useUserLocation } from "@/shared/hooks/use-user-location";
import { saveLastReceipt } from "@/shared/lib/receipt-store";
import { formatMoney, formatNumber } from "@/shared/lib/format";
import { stationStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CustomerMap } from "@/shared/ui/customer-map";

export default function RentalReturnPage() {
  const params = useParams<{ rentalId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { coords } = useUserLocation();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const activeRentalQuery = useQuery({
    queryKey: ["customer", "active-rental"],
    queryFn: getActiveRental,
  });

  const rental = activeRentalQuery.data;

  const startStationQuery = useQuery({
    queryKey: ["customer", "station", rental?.startStationId],
    queryFn: () => getStation(rental!.startStationId),
    enabled: Boolean(rental?.startStationId),
  });

  const stationsQuery = useQuery({
    queryKey: ["customer", "return-stations", params.rentalId, coords.lat, coords.lng],
    queryFn: () => getReturnStations(params.rentalId, { ...coords, radiusKm: 5, limit: 12 }),
    enabled: Boolean(params.rentalId),
  });

  const selectedStation =
    stationsQuery.data?.find((station) => station.id === selectedStationId) ??
    stationsQuery.data?.[0] ??
    null;

  const returnMutation = useMutation({
    mutationFn: () => {
      if (!selectedStation) {
        throw new Error("Return station сонгоогүй байна");
      }

      return returnRentalAutoSelect(params.rentalId, selectedStation.id);
    },
    onSuccess: async (returnedRental) => {
      saveLastReceipt(
        toReceiptSnapshot({
          rental: returnedRental,
          startStationName: startStationQuery.data?.name,
          endStationName: selectedStation?.name,
        }),
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer", "active-rental"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "rental-history"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "home"] }),
      ]);

      router.replace(`/rental/${params.rentalId}/receipt`);
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[30px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
          Return Flow
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Буцаах station сонгох
        </h1>

        <div className="mt-5 rounded-[24px] bg-[var(--primary-50)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Эхэлсэн station</p>
          <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {startStationQuery.data?.name ?? rental?.startStationId ?? "—"}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Deposit {rental ? formatMoney(rental.depositAmount) : "—"}
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {stationsQuery.data?.map((station) => (
            <button
              key={station.id}
              type="button"
              className={`rounded-[22px] border p-5 text-left transition ${
                selectedStationId === station.id
                  ? "border-[var(--primary-600)] bg-[var(--primary-50)]"
                  : "border-[var(--border)] bg-white/88"
              }`}
              onClick={() => setSelectedStationId(station.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{station.name}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{station.address}</p>
                </div>
                <Badge tone={statusTone(station.status)}>{stationStatusLabels[station.status]}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                <span>{formatNumber(station.distanceMeters)}м</span>
                <span>{station.emptySlots} хоосон slot</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Button
            className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
            onClick={() => returnMutation.mutate()}
            disabled={returnMutation.isPending || !selectedStation}
          >
            <CheckCircle2 className="size-4" />
            {returnMutation.isPending ? "Буцааж байна..." : "Auto-return хийх"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-[30px] p-4">
        <div className="mb-4 flex items-center gap-3 px-2 pt-2">
          <div className="flex size-11 items-center justify-center rounded-[16px] bg-[var(--primary-50)] text-[var(--primary-700)]">
            <MapPinned className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
              Return Map
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Nearby station
            </h2>
          </div>
        </div>

        <CustomerMap
          points={stationsQuery.data ?? []}
          selectedId={selectedStation?.id}
          onSelect={setSelectedStationId}
          className="min-h-[560px]"
        />
      </Card>
    </div>
  );
}
