"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CreditCard, MapPinned, QrCode, Wallet, Zap } from "lucide-react";
import { getHomeSummary } from "@/shared/api/customer";
import { useUserLocation } from "@/shared/hooks/use-user-location";
import { formatDurationSince, formatMoney, formatNumber } from "@/shared/lib/format";
import { stationStatusLabels, statusTone } from "@/shared/lib/status";
import type { NearbyStation } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CustomerMap } from "@/shared/ui/customer-map";

function StationPreviewCard({
  station,
}: Readonly<{
  station: NearbyStation;
}>) {
  return (
    <Link href={`/stations/${station.id}`}>
      <Card className="h-full rounded-[24px] border-white/70 bg-white/90 p-5 transition hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">{station.name}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{station.address}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={statusTone(station.status)}>{stationStatusLabels[station.status]}</Badge>
            <Badge tone={statusTone(station.online)}>
              {station.online ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>{formatNumber(station.distanceMeters)}м</span>
          <span>{station.availableSlots} slot бэлэн</span>
        </div>
      </Card>
    </Link>
  );
}

export default function HomeScreen() {
  const { coords, hasExactLocation } = useUserLocation();
  const summaryQuery = useQuery({
    queryKey: ["customer", "home", coords.lat, coords.lng],
    queryFn: () => getHomeSummary({ ...coords, limit: 6, radiusKm: 5 }),
    staleTime: 20_000,
  });

  const summary = summaryQuery.data;
  const nearbyStations = summary?.nearbyStations ?? [];

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="powergo-hero overflow-hidden rounded-[28px] border-white/15 p-6 md:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                  Wallet
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                  {summary ? formatMoney(summary.wallet.availableBalance) : "..." }
                </h1>
                <p className="mt-2 text-sm text-white/78">
                  Боломжтой үлдэгдэл
                  {summary ? ` · Нийт ${formatMoney(summary.wallet.balance)}` : ""}
                </p>
              </div>

              <div className="rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm font-medium text-white/82">
                {hasExactLocation ? "Таны байршил" : "УБ default"}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Link
                href="/scan"
                className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur transition hover:bg-white/18"
              >
                <QrCode className="size-5" />
                <p className="mt-4 text-base font-semibold">QR уншуулах</p>
                <p className="mt-2 text-sm text-white/72">Station дээрээс шууд эхлүүлнэ</p>
              </Link>

              <Link
                href="/stations"
                className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur transition hover:bg-white/18"
              >
                <MapPinned className="size-5" />
                <p className="mt-4 text-base font-semibold">Станц хайх</p>
                <p className="mt-2 text-sm text-white/72">Газрын зураг болон list view</p>
              </Link>

              <Link
                href="/wallet"
                className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur transition hover:bg-white/18"
              >
                <Wallet className="size-5" />
                <p className="mt-4 text-base font-semibold">Wallet цэнэглэх</p>
                <p className="mt-2 text-sm text-white/72">Bonum линкээр төлбөр үргэлжлүүлнэ</p>
              </Link>
            </div>

            {summary?.activeRental ? (
              <div className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-[16px] bg-white/16">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">
                      Идэвхтэй түрээс
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {formatDurationSince(summary.activeRental.startedAt)} явж байна
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[28px] border-white/65 p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                Map Preview
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Ойролцоох станцууд
              </h2>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/stations">Бүгд</Link>
            </Button>
          </div>

          <CustomerMap points={nearbyStations} className="min-h-[320px]" />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                Nearby
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Ойрхон station
              </h3>
            </div>
            <Link href="/stations" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-700)]">
              Бүгд
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {nearbyStations.length ? (
              nearbyStations.slice(0, 4).map((station) => (
                <StationPreviewCard key={station.id} station={station} />
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--border)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">
                {summaryQuery.isLoading
                  ? "Станцын мэдээлэл ачаалж байна..."
                  : "Ойролцоо station олдсонгүй."}
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[28px] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
            Quick Balance
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Санхүүгийн товч
          </h3>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] bg-[var(--primary-50)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Боломжтой үлдэгдэл</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {summary ? formatMoney(summary.wallet.availableBalance) : "—"}
              </p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm text-[var(--text-muted)]">Блоклогдсон дүн</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {summary ? formatMoney(summary.wallet.frozenAmount) : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
              <Link href="/wallet">
                <CreditCard className="size-4" />
                Wallet
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/rental/history">Түрээсийн түүх</Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
