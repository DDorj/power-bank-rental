"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListFilter, Map, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNearbyStations } from "@/shared/api/customer";
import { useUserLocation } from "@/shared/hooks/use-user-location";
import { formatNumber } from "@/shared/lib/format";
import { stationStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CustomerMap } from "@/shared/ui/customer-map";

export default function StationsPage() {
  const { coords } = useUserLocation();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"split" | "list">("split");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stationsQuery = useQuery({
    queryKey: ["customer", "stations", coords.lat, coords.lng],
    queryFn: () => getNearbyStations({ ...coords, limit: 20, radiusKm: 8 }),
    staleTime: 20_000,
  });

  const stations = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const raw = stationsQuery.data ?? [];

    if (!normalized) {
      return raw;
    }

    return raw.filter((station) =>
      `${station.name} ${station.address}`.toLowerCase().includes(normalized),
    );
  }, [search, stationsQuery.data]);

  const selectedStation = stations.find((station) => station.id === selectedId) ?? stations[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <Card className="rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                Stations
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Ойролцоох station
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={mode === "split" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMode("split")}
              >
                <Map className="size-4" />
                Map
              </Button>
              <Button
                variant={mode === "list" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMode("list")}
              >
                <ListFilter className="size-4" />
                List
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Station эсвэл хаяг хайх"
              className="h-12 w-full rounded-[18px] border border-white/70 bg-white pl-10 pr-4 text-sm outline-none ring-0"
            />
          </div>

          <div className="powergo-scrollbar flex max-h-[540px] flex-col gap-3 overflow-y-auto pr-1">
            {stations.length ? (
              stations.map((station) => (
                <div
                  key={station.id}
                  className="w-full text-left"
                >
                  <Card
                    className="rounded-[22px] border-white/70 bg-white/88 p-5 transition hover:-translate-y-0.5"
                    onClick={() => setSelectedId(station.id)}
                  >
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

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                      <span>{formatNumber(station.distanceMeters)}м</span>
                      <span>{station.availableSlots} slot available</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--primary-700)]">
                        {selectedId === station.id ? "Сонгогдсон" : "Дэлгэрэнгүй"}
                      </p>
                      <Link
                        href={`/stations/${station.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-full bg-[var(--primary-50)] px-3 py-1 text-sm font-medium text-[var(--primary-700)]"
                      >
                        Нээх
                      </Link>
                    </div>
                  </Card>
                </div>
              ))
            ) : (
              <Card className="rounded-[22px] border border-dashed border-[var(--border)] bg-white/72 p-6 text-center text-sm text-[var(--text-muted)]">
                {stationsQuery.isLoading
                  ? "Station мэдээлэл ачаалж байна..."
                  : search.trim()
                    ? "Хайлтад тохирох station олдсонгүй."
                    : "Ойролцоо station олдсонгүй."}
              </Card>
            )}
          </div>
        </div>
      </Card>

      <div className={mode === "list" ? "hidden lg:block" : "block"}>
        <Card className="sticky top-4 rounded-[28px] p-4">
          <CustomerMap
            points={stations}
            selectedId={selectedStation?.id ?? null}
            onSelect={setSelectedId}
            className="min-h-[560px]"
          />

          {selectedStation ? (
            <div className="mt-4 rounded-[22px] bg-white/88 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold text-[var(--foreground)]">{selectedStation.name}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{selectedStation.address}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge tone={statusTone(selectedStation.status)}>
                    {stationStatusLabels[selectedStation.status]}
                  </Badge>
                  <Badge tone={statusTone(selectedStation.online)}>
                    {selectedStation.online ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <span>{formatNumber(selectedStation.distanceMeters)}м</span>
                <span>{selectedStation.availableSlots} slot бэлэн</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
                  <Link href={`/stations/${selectedStation.id}`}>Station detail</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/scan">QR эхлүүлэх</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
