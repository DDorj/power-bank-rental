"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock3, MapPinned, ShieldCheck } from "lucide-react";
import { getActiveRental, getReturnStations, getStation } from "@/shared/api/customer";
import { useUserLocation } from "@/shared/hooks/use-user-location";
import { formatDurationSince, formatMoney } from "@/shared/lib/format";
import { rentalStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CustomerMap } from "@/shared/ui/customer-map";

export default function ActiveRentalPage() {
  const { coords } = useUserLocation();
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

  const returnStationsQuery = useQuery({
    queryKey: ["customer", "return-stations", rental?.id, coords.lat, coords.lng],
    queryFn: () => getReturnStations(rental!.id, { ...coords, radiusKm: 5, limit: 8 }),
    enabled: Boolean(rental?.id),
  });

  const topStations = (returnStationsQuery.data ?? []).slice(0, 6);

  if (!rental) {
    return (
      <Card className="rounded-[30px] p-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
          Active Rental
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Идэвхтэй түрээс алга
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          QR scan хийж түрээс эхлүүлсний дараа энэ дэлгэц дээр live status харагдана.
        </p>
        <div className="mt-6">
          <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
            <Link href="/scan">QR уншуулах</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
      <Card className="powergo-hero rounded-[30px] border-white/14 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              Rental Live
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
              {formatDurationSince(rental.startedAt)}
            </h1>
            <p className="mt-3 text-sm text-white/78">
              Түрээс {rentalStatusLabels[rental.status].toLowerCase()} төлөвтэй байна
            </p>
          </div>
          <Badge tone={statusTone(rental.status)} className="bg-white/90 text-[var(--foreground)]">
            {rentalStatusLabels[rental.status]}
          </Badge>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur">
            <p className="text-sm text-white/72">Power bank</p>
            <p className="mt-2 text-xl font-semibold text-white">{rental.powerBankId}</p>
          </div>
          <div className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur">
            <p className="text-sm text-white/72">Deposit</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatMoney(rental.depositAmount)}</p>
          </div>
          <div className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur">
            <p className="text-sm text-white/72">Charge</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {rental.chargeAmount ? formatMoney(rental.chargeAmount) : "Тооцоологдож байна"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        <Card className="rounded-[30px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[18px] bg-[var(--primary-50)] text-[var(--primary-700)]">
              <MapPinned className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                Start Station
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {startStationQuery.data?.name ?? rental.startStationId}
              </h2>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {startStationQuery.data?.address ?? "Station detail ачаалж байна."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
              <Link href={`/rental/${rental.id}/return`}>Буцаах station сонгох</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/stations">Бусад station харах</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-[30px] p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Clock3 className="size-4" />
                Эхэлсэн
              </div>
              <p className="mt-2 font-semibold text-[var(--foreground)]">{rental.startedAt}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <ShieldCheck className="size-4" />
                Return options
              </div>
              <p className="mt-2 font-semibold text-[var(--foreground)]">
                {(returnStationsQuery.data ?? []).length} station
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="lg:col-span-2 rounded-[30px] p-4">
        <div className="mb-4 flex items-center justify-between gap-4 px-2 pt-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
              Return Map
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Буцаах боломжтой station
            </h2>
          </div>
        </div>

        <CustomerMap points={topStations} className="min-h-[340px]" />
      </Card>
    </div>
  );
}
