"use client";

import { MapPinned, Navigation } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { NearbyStation, ReturnStationOption } from "@/shared/types/api";

type MapPoint = Pick<NearbyStation, "id" | "name" | "lat" | "lng" | "availableSlots"> & {
  status?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function project(points: MapPoint[], index: number) {
  const lats = points.map((item) => item.lat);
  const lngs = points.map((item) => item.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  const point = points[index];

  const yRatio = latMax === latMin ? 0.5 : 1 - (point.lat - latMin) / (latMax - latMin);
  const xRatio = lngMax === lngMin ? 0.5 : (point.lng - lngMin) / (lngMax - lngMin);

  return {
    left: `${clamp(12 + xRatio * 76, 12, 88)}%`,
    top: `${clamp(12 + yRatio * 68, 12, 80)}%`,
  };
}

export function CustomerMap({
  points,
  selectedId,
  onSelect,
  userLabel = "Та",
  className,
}: Readonly<{
  points: Array<MapPoint | ReturnStationOption>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  userLabel?: string;
  className?: string;
}>) {
  const normalized = points.map((point) => ({
    id: point.id,
    name: point.name,
    lat: point.lat,
    lng: point.lng,
    availableSlots: "availableSlots" in point ? point.availableSlots : point.emptySlots,
    status: point.status,
  }));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.8),_rgba(255,255,255,0.96)_45%,_rgba(239,246,255,0.96)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-x-6 top-8 h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.18),transparent)]" />
        <div className="absolute inset-x-10 bottom-16 h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.14),transparent)]" />
        <div className="absolute left-10 top-6 bottom-6 w-px bg-[linear-gradient(180deg,transparent,rgba(37,99,235,0.16),transparent)]" />
        <div className="absolute right-14 top-10 bottom-10 w-px bg-[linear-gradient(180deg,transparent,rgba(37,99,235,0.14),transparent)]" />
      </div>

      <div className="relative h-[280px]">
        <div className="absolute left-[50%] top-[55%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="flex size-11 items-center justify-center rounded-full border-4 border-white bg-[var(--primary-600)] text-white shadow-lg">
            <Navigation className="size-4" />
          </div>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] shadow-sm">
            {userLabel}
          </span>
        </div>

        {normalized.map((point, index) => {
          const position = project(normalized, index);
          const isSelected = point.id === selectedId;
          const isOffline = point.status === "inactive" || point.status === "maintenance";

          return (
            <button
              key={point.id}
              type="button"
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={position}
              onClick={() => onSelect?.(point.id)}
            >
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border-4 border-white text-white shadow-md transition-transform group-hover:scale-105",
                  isSelected ? "bg-[var(--primary-700)]" : isOffline ? "bg-slate-400" : "bg-[var(--primary-500)]",
                )}
              >
                <MapPinned className="size-4" />
              </div>
              <div
                className={cn(
                  "max-w-[140px] rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                  isSelected ? "bg-[var(--foreground)] text-white" : "bg-white/90 text-[var(--text-muted)]",
                )}
              >
                {point.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
