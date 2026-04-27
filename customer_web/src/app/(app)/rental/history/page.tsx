"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getRentalHistory } from "@/shared/api/customer";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { rentalStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

export default function RentalHistoryPage() {
  const historyQuery = useQuery({
    queryKey: ["customer", "rental-history"],
    queryFn: () => getRentalHistory(1, 20),
  });

  const rentals = historyQuery.data?.data ?? [];

  return (
    <Card className="rounded-[30px] p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
            History
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Түрээсийн түүх
          </h1>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/scan">Шинэ түрээс</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {rentals.map((rental) => (
          <div key={rental.id} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">{rental.powerBankId}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Эхэлсэн {formatDateTime(rental.startedAt)}
                </p>
              </div>
              <Badge tone={statusTone(rental.status)}>{rentalStatusLabels[rental.status]}</Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm text-[var(--text-muted)]">Deposit</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">{formatMoney(rental.depositAmount)}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm text-[var(--text-muted)]">Charge</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {rental.chargeAmount ? formatMoney(rental.chargeAmount) : "—"}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm text-[var(--text-muted)]">Return</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {rental.returnedAt ? formatDateTime(rental.returnedAt) : "Идэвхтэй"}
                </p>
              </div>
            </div>

            {rental.status === "active" ? (
              <div className="mt-4">
                <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
                  <Link href="/rental/active">Идэвхтэй түрээс рүү</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
