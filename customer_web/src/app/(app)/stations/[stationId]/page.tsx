"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPinned, QrCode, Share2, Wallet } from "lucide-react";
import { getStation } from "@/shared/api/customer";
import { formatDateTime, formatNumber, formatPercent } from "@/shared/lib/format";
import { stationStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CustomerMap } from "@/shared/ui/customer-map";

export default function StationDetailPage() {
  const params = useParams<{ stationId: string }>();
  const stationQuery = useQuery({
    queryKey: ["customer", "station", params.stationId],
    queryFn: () => getStation(params.stationId),
    enabled: Boolean(params.stationId),
  });

  const station = stationQuery.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
      <Card className="overflow-hidden rounded-[30px] p-0">
        <div className="powergo-hero p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <Button variant="secondary" asChild>
              <Link href="/stations">
                <ArrowLeft className="size-4" />
                Буцах
              </Link>
            </Button>

            {station ? (
              <Badge tone={statusTone(station.status)} className="bg-white/90 text-[var(--foreground)]">
                {stationStatusLabels[station.status]}
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-10 text-3xl font-semibold text-white md:text-4xl">
            {station?.name ?? "Station ачаалж байна..."}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
            {station?.address ?? "Station detail ачаалж байна."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/16 px-4 py-2 text-sm font-medium text-white/82">
              {station ? `${station.availableSlots} бэлэн slot` : "—"}
            </span>
            <span className="rounded-full bg-white/16 px-4 py-2 text-sm font-medium text-white/82">
              {station?.supportsReturn ? "Буцаах боломжтой" : "Буцаах боломжгүй"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="rounded-[22px] bg-[var(--primary-50)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Нийт slot</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {station ? formatNumber(station.totalSlots) : "—"}
            </p>
          </div>
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Occupied</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {station ? formatNumber(station.occupiedSlots) : "—"}
            </p>
          </div>
          <div className="rounded-[22px] bg-emerald-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Available</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {station ? formatNumber(station.inventorySummary.availableCount) : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <Card className="rounded-[24px] bg-white/88 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                  Inventory Summary
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  Одоогийн нөөц
                </h2>
              </div>
            </div>

            {station ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Нийт power bank", station.inventorySummary.totalPowerBanks],
                  ["Бэлэн", station.inventorySummary.availableCount],
                  ["Цэнэглэж буй", station.inventorySummary.chargingCount],
                  ["Түрээслэгдсэн", station.inventorySummary.rentedCount],
                  ["Гэмтэлтэй", station.inventorySummary.faultyCount],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[20px] bg-slate-50 p-4">
                    <p className="text-sm text-[var(--text-muted)]">{label}</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatNumber(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="rounded-[24px] bg-white/88 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
              Slot Detail
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              Slot жагсаалт
            </h2>

            <div className="mt-5 grid gap-3">
              {station?.slots.slice(0, 6).map((slot) => (
                <div key={slot.id} className="rounded-[18px] border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--foreground)]">Slot #{slot.slotIndex}</p>
                    <Badge tone={statusTone(slot.status === "occupied" ? "active" : slot.status === "faulty" ? "failed" : "completed")}>
                      {slot.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {slot.powerBank
                      ? `${slot.powerBank.serialNumber} · ${formatPercent(slot.powerBank.chargeLevel)}`
                      : "Power bank байхгүй"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="rounded-[30px] p-4">
          <CustomerMap points={station ? [station] : []} selectedId={station?.id} className="min-h-[320px]" />
        </Card>

        <Card className="rounded-[30px] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
            Action Center
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Түрээс эхлүүлэх
          </h2>

          <div className="mt-5 grid gap-3">
            <Button asChild className="h-12 rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
              <Link href="/scan">
                <QrCode className="size-4" />
                QR уншуулах
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/wallet">
                <Wallet className="size-4" />
                Wallet шалгах
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/stations">
                <MapPinned className="size-4" />
                Бусад station
              </Link>
            </Button>
          </div>

          <div className="mt-6 rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Last heartbeat</p>
            <p className="mt-2 font-medium text-[var(--foreground)]">
              {formatDateTime(station?.lastHeartbeatAt)}
            </p>
          </div>

          <div className="mt-3 rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Share</p>
            <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-700)]">
              <Share2 className="size-4" />
              Location share
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
