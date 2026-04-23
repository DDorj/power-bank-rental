"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BatteryCharging,
  ChartNoAxesCombined,
  CreditCard,
  MapPinned,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardOverview } from "@/shared/api/admin";
import { getErrorMessage } from "@/shared/lib/error";
import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";

export function DashboardScreen() {
  const overviewQuery = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  if (overviewQuery.isLoading) {
    return <LoadingScreen label="Dashboard уншиж байна..." />;
  }

  if (overviewQuery.isError) {
    return (
      <ErrorState
        description={getErrorMessage(overviewQuery.error)}
        onRetry={() => overviewQuery.refetch()}
      />
    );
  }

  const overview = overviewQuery.data;
  if (!overview) {
    return <LoadingScreen label="Dashboard өгөгдөл хүлээж байна..." />;
  }

  const chartData = [
    {
      label: "Stations",
      active: overview.stations.active,
      issue: overview.stations.inactive + overview.stations.maintenance,
    },
    {
      label: "Rentals",
      active: overview.rentals.active,
      issue: overview.rentals.overdue,
    },
    {
      label: "Payments",
      active: overview.payments.paidToday,
      issue: overview.payments.pendingInvoices,
    },
  ];

  const signalRows = [
    {
      label: "Station uptime",
      value: `${formatNumber(overview.stations.online)} online / ${formatNumber(overview.stations.offline)} offline`,
    },
    {
      label: "Pending finance",
      value: `${formatNumber(overview.payments.pendingInvoices)} invoices waiting`,
    },
    {
      label: "Frozen amount",
      value: formatMoney(overview.wallet.totalFrozenAmount),
    },
    {
      label: "Completed today",
      value: `${formatNumber(overview.rentals.completedToday)} rentals`,
    },
  ];

  const headerSignals = [
    {
      label: "Stations online",
      value: `${formatNumber(overview.stations.online)}/${formatNumber(overview.stations.total)}`,
    },
    {
      label: "Pending invoices",
      value: formatNumber(overview.payments.pendingInvoices),
    },
    {
      label: "Available banks",
      value: formatNumber(overview.stations.availablePowerBanks),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`Сүүлийн snapshot: ${new Date(overview.generatedAt).toLocaleString("mn-MN")}`}
        actions={
          <div className="flex flex-wrap gap-1.5 md:justify-end">
            {headerSignals.map((item) => (
              <div
                key={item.label}
                className="inline-flex items-baseline gap-2 rounded-full border border-[color:var(--line)] bg-slate-50 px-3 py-1.5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={formatNumber(overview.users.total)}
          hint={`${formatNumber(overview.users.active)} active • ${formatNumber(
            overview.users.admins,
          )} admin`}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Stations"
          value={formatNumber(overview.stations.total)}
          hint={`${overview.stations.availablePowerBanks} available banks`}
          icon={<MapPinned className="size-5" />}
        />
        <StatCard
          label="Active Rentals"
          value={formatNumber(overview.rentals.active)}
          hint={`${overview.rentals.overdue} overdue`}
          icon={<Activity className="size-5" />}
        />
        <StatCard
          label="Wallet Balance"
          value={formatMoney(overview.wallet.totalBalance)}
          hint={`${formatMoney(overview.wallet.totalFrozenAmount)} frozen`}
          icon={<Wallet className="size-5" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <Card className="p-0">
          <div className="border-b border-[color:var(--line)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-[10px] border border-[color:var(--line)] bg-[var(--accent-bg)] p-2.5 text-[var(--accent)]">
                <ChartNoAxesCombined className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Activity overview
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Stations, rentals, payments-ийн үндсэн төлөв.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.2fr)_260px]">
            <div className="h-[260px] rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-3 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(15,23,42,0.08)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="active" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="issue" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {signalRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    {row.label}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-[var(--foreground)]">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-[10px] border border-[color:var(--line)] bg-[var(--accent-bg)] p-2.5 text-[var(--accent)]">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Payments
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Өдрийн санхүүгийн гол тоонууд.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Paid today
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {formatNumber(overview.payments.paidToday)}
                </p>
              </div>
              <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Topup amount
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {formatMoney(overview.payments.totalTopupAmount)}
                </p>
              </div>
              <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Pending invoices
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {formatNumber(overview.payments.pendingInvoices)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-[10px] border border-[color:var(--line)] bg-[var(--accent-bg)] p-2.5 text-[var(--accent)]">
                <BatteryCharging className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Station inventory
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Slots болон available power bank тооллого.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["Total slots", formatNumber(overview.stations.totalSlots)],
                [
                  "Available power banks",
                  formatNumber(overview.stations.availablePowerBanks),
                ],
                ["Completed today", formatNumber(overview.rentals.completedToday)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[12px] border border-[color:var(--line)] bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm text-[var(--muted)]">{label}</span>
                  <span className="text-lg font-semibold text-[var(--foreground)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
