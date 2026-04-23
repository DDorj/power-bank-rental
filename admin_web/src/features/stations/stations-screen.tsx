"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Clock3,
  Gauge,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Server,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStation, deleteStation, getStations, updateStation } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { stationStatusLabels, statusTone } from "@/shared/lib/status";
import type { StationListItem } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";

const stationSchema = z.object({
  name: z.string().min(2, "Нэр оруулна уу"),
  address: z.string().min(6, "Хаяг оруулна уу"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  totalSlots: z.number().int().min(1).max(30),
  mqttDeviceId: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
});

type StationFormValues = z.infer<typeof stationSchema>;
type ViewMode = "list" | "create" | "edit";

const defaultValues: StationFormValues = {
  name: "",
  address: "",
  lat: 47.9189,
  lng: 106.9177,
  totalSlots: 12,
  mqttDeviceId: "",
  status: "active",
};

export function StationsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const stationsQuery = useQuery({
    queryKey: ["stations"],
    queryFn: getStations,
  });

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues,
  });

  const mode: ViewMode = (() => {
    const rawMode = searchParams.get("mode");
    if (rawMode === "create") {
      return "create";
    }
    if (rawMode === "edit") {
      return "edit";
    }
    return "list";
  })();
  const editingId = searchParams.get("id");

  const openList = () => router.push("/stations");
  const openCreate = () => {
    setFormError(null);
    router.push("/stations?mode=create");
  };
  const openEdit = (stationId: string) => {
    setFormError(null);
    router.push(`/stations?mode=edit&id=${stationId}`);
  };

  const selectedStation =
    mode === "edit" && stationsQuery.data
      ? stationsQuery.data.find((item) => item.id === editingId) ?? null
      : null;
  const selectedSnapshotKey = selectedStation
    ? `${selectedStation.id}:${selectedStation.updatedAt}`
    : mode;

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    if (!stationsQuery.data) {
      return;
    }

    if (!selectedStation) {
      router.replace("/stations");
    }
  }, [mode, router, selectedStation, stationsQuery.data]);

  useEffect(() => {
    if (mode === "create") {
      form.reset(defaultValues);
      return;
    }

    if (mode === "edit" && selectedStation) {
      form.reset({
        name: selectedStation.name,
        address: selectedStation.address,
        lat: selectedStation.lat,
        lng: selectedStation.lng,
        totalSlots: selectedStation.totalSlots,
        mqttDeviceId: selectedStation.mqttDeviceId || "",
        status: selectedStation.status,
      });
    }
  }, [form, mode, selectedSnapshotKey, selectedStation]);

  const upsertMutation = useMutation({
    mutationFn: async (values: StationFormValues) => {
      if (selectedStation) {
        return updateStation(selectedStation.id, {
          name: values.name,
          address: values.address,
          lat: values.lat,
          lng: values.lng,
          mqttDeviceId: values.mqttDeviceId || undefined,
          status: values.status,
        });
      }

      return createStation({
        name: values.name,
        address: values.address,
        lat: values.lat,
        lng: values.lng,
        totalSlots: values.totalSlots,
        mqttDeviceId: values.mqttDeviceId || undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      form.reset(defaultValues);
      router.push("/stations");
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
    onError: (error) => setFormError(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStation,
    onSuccess: async () => {
      form.reset(defaultValues);
      router.push("/stations");
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });

  const resetEditor = () => {
    setFormError(null);
    if (selectedStation) {
      form.reset({
        name: selectedStation.name,
        address: selectedStation.address,
        lat: selectedStation.lat,
        lng: selectedStation.lng,
        totalSlots: selectedStation.totalSlots,
        mqttDeviceId: selectedStation.mqttDeviceId || "",
        status: selectedStation.status,
      });
      return;
    }

    form.reset(defaultValues);
  };

  const columns: ColumnDef<StationListItem>[] = [
    {
      header: "Station",
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--foreground)]">{row.original.name}</p>
            <p className="text-xs leading-5 text-[var(--muted)]">{row.original.address}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-[8px] border border-[color:var(--line)] bg-slate-50 px-2.5 py-1 text-xs text-[var(--muted)]">
            <MapPin className="size-3.5" />
            {row.original.lat.toFixed(4)}, {row.original.lng.toFixed(4)}
          </div>
        </div>
      ),
    },
    {
      header: "Health",
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(row.original.status)}>
              {stationStatusLabels[row.original.status]}
            </Badge>
            <Badge tone={statusTone(row.original.online)}>
              {row.original.online ? "Online" : "Offline"}
            </Badge>
          </div>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Heartbeat: {formatDateTime(row.original.lastHeartbeatAt)}
          </p>
        </div>
      ),
    },
    {
      header: "Capacity",
      cell: ({ row }) => {
        const usage =
          row.original.totalSlots > 0
            ? (row.original.occupiedSlots / row.original.totalSlots) * 100
            : 0;

        return (
          <div className="min-w-[170px] space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {formatNumber(row.original.availableSlots)}/
                  {formatNumber(row.original.totalSlots)}
                </p>
                <p className="text-xs text-[var(--muted)]">available slots</p>
              </div>
              <p className="text-xs text-[var(--muted)]">
                occupied {formatNumber(row.original.occupiedSlots)}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Device",
      cell: ({ row }) => (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {row.original.mqttDeviceId || "MQTT холболтгүй"}
          </p>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Total slots {formatNumber(row.original.totalSlots)}
          </p>
        </div>
      ),
    },
    {
      header: "Updated",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {formatDateTime(row.original.updatedAt)}
          </p>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Created {formatDateTime(row.original.createdAt)}
          </p>
        </div>
      ),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <div className="flex min-w-[140px] flex-col gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              openEdit(row.original.id);
            }}
          >
            <Pencil className="mr-1 size-4" />
            Засах
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (!window.confirm(`${row.original.name} station-г устгах уу?`)) {
                return;
              }
              await deleteMutation.mutateAsync(row.original.id);
            }}
          >
            <Trash2 className="mr-1 size-4" />
            Устгах
          </Button>
        </div>
      ),
    },
  ];

  if (stationsQuery.isLoading) {
    return <LoadingScreen label="Stations уншиж байна..." />;
  }

  if (stationsQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(stationsQuery.error)}
        onRetry={() => stationsQuery.refetch()}
      />
    );
  }

  const stations = stationsQuery.data;
  if (!stations) {
    return <LoadingScreen label="Stations өгөгдөл хүлээж байна..." />;
  }

  const stats = {
    total: stations.length,
    online: stations.filter((station) => station.online).length,
    maintenance: stations.filter((station) => station.status === "maintenance").length,
    availableSlots: stations.reduce((sum, station) => sum + station.availableSlots, 0),
  };

  const editorTitle =
    mode === "create"
      ? "Create station"
      : selectedStation
        ? "Edit station"
        : "Station editor";
  const editorDescription =
    mode === "create"
      ? "Шинэ cabinet эсвэл station-ийг бүртгэх форм."
      : selectedStation
        ? `${selectedStation.name} station-ийн operational мэдээллийг шинэчилнэ.`
        : "Station засварлахын тулд жагсаалтаас мөр сонгоно.";

  const selectedSummary = selectedStation
    ? [
        {
          label: "Current status",
          value: stationStatusLabels[selectedStation.status],
        },
        {
          label: "Current capacity",
          value: `${formatNumber(selectedStation.availableSlots)}/${formatNumber(
            selectedStation.totalSlots,
          )} available`,
        },
        {
          label: "Last updated",
          value: formatDateTime(selectedStation.updatedAt),
        },
      ]
    : [];

  if (mode === "list") {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Station Management"
          title="Stations"
          description="Station registry, health, connectivity, capacity-ийг нэг хүснэгтээс хяна."
          actions={
            <Button variant="secondary" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Шинэ station
            </Button>
          }
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="space-y-2 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Total stations
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatNumber(stats.total)}
            </p>
          </Card>
          <Card className="space-y-2 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Online
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatNumber(stats.online)}
            </p>
          </Card>
          <Card className="space-y-2 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Maintenance
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatNumber(stats.maintenance)}
            </p>
          </Card>
          <Card className="space-y-2 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Free slots
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {formatNumber(stats.availableSlots)}
            </p>
          </Card>
        </section>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--line)] px-5 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Station registry
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Status, heartbeat, slot usage, MQTT mapping-ийг нэг хүснэгтээс хяна.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Online</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {formatNumber(stats.online)}
                  </p>
                </div>
                <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Maintenance</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {formatNumber(stats.maintenance)}
                  </p>
                </div>
                <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Free slots</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {formatNumber(stats.availableSlots)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            <DataTable
              data={stations}
              columns={columns}
              emptyTitle="Station алга"
              emptyDescription="Эхний station-аа энэ хуудаснаас үүсгэнэ."
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Station Editor"
        title={editorTitle}
        description={editorDescription}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openList}>
              <ArrowLeft className="mr-2 size-4" />
              Жагсаалт руу буцах
            </Button>
            {selectedStation ? (
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={async () => {
                  if (!selectedStation) {
                    return;
                  }
                  if (!window.confirm(`${selectedStation.name} station-г устгах уу?`)) {
                    return;
                  }
                  await deleteMutation.mutateAsync(selectedStation.id);
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Устгах
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--line)] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {mode === "create" ? "Create Mode" : "Edit Mode"}
                </p>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  {editorTitle}
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {editorDescription}
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={resetEditor}>
                <RefreshCcw className="mr-2 size-4" />
                Reset
              </Button>
            </div>

            {selectedStation ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {selectedSummary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-4 py-3"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-6 text-[var(--foreground)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                New station create хийхэд slot count хадгалагдана, initial status нь
                `active` байна. Дараа нь registry жагсаалтаас edit mode руу орж status update
                хийж болно.
              </div>
            )}
          </div>

          <form
            className="space-y-4 p-5"
            onSubmit={form.handleSubmit((values) => upsertMutation.mutate(values))}
          >
            <section className="space-y-4 rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-[10px] border border-[color:var(--line)] bg-white text-[var(--ink-soft)]">
                  <Server className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Basic information
                  </h3>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Station нэр болон хаягийг operator-д ойлгомжтой байдлаар оруул.
                  </p>
                </div>
              </div>

              <Field
                label="Нэр"
                error={form.formState.errors.name?.message}
                hint="2+ тэмдэгт"
              >
                <Input {...form.register("name")} placeholder="Zaisan Mall East" />
              </Field>
              <Field
                label="Хаяг"
                error={form.formState.errors.address?.message}
                hint="6+ тэмдэгт"
              >
                <Input
                  {...form.register("address")}
                  placeholder="Хан-Уул дүүрэг, Зайсангийн гудамж"
                />
              </Field>
            </section>

            <section className="space-y-4 rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-[10px] border border-[color:var(--line)] bg-white text-[var(--ink-soft)]">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Location
                  </h3>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    GPS координат нь map integration болон station routing-д ашиглагдана.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Latitude" error={form.formState.errors.lat?.message}>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="47.9189"
                    {...form.register("lat", { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Longitude" error={form.formState.errors.lng?.message}>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="106.9177"
                    {...form.register("lng", { valueAsNumber: true })}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4 rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-[10px] border border-[color:var(--line)] bg-white text-[var(--ink-soft)]">
                  <Gauge className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Capacity and device
                  </h3>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Slot capacity create үед тогтоно. MQTT device ID нь cabinet mapping-д ашиглагдана.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Нийт slot"
                  error={form.formState.errors.totalSlots?.message}
                  hint={selectedStation ? "Edit үед түгжигдэнэ" : "1-30"}
                >
                  <Input
                    type="number"
                    placeholder="12"
                    {...form.register("totalSlots", { valueAsNumber: true })}
                    disabled={!!selectedStation}
                  />
                </Field>
                <Field label="MQTT Device ID" hint="Optional">
                  <Input
                    {...form.register("mqttDeviceId")}
                    placeholder="station-zaisan-01"
                  />
                </Field>
              </div>

              {selectedStation ? (
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field label="Status" error={fieldState.error?.message}>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              ) : (
                <div className="rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 items-center justify-center rounded-[10px] bg-slate-100 text-[var(--ink-soft)]">
                      <Clock3 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Initial status
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Create үед шинэ station `active` төлөвтэй бүртгэгдэнэ.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {formError ? (
              <p className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[var(--muted)]">
                Station create болон update үйлдлийн дараа registry list рүү буцна.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={openList}>
                  Болих
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending
                    ? "Хадгалж байна..."
                    : selectedStation
                      ? "Station update"
                      : "Station create"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
