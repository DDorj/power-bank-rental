"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, History, Wallet } from "lucide-react";
import { clearLastReceipt, loadLastReceipt } from "@/shared/lib/receipt-store";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

export default function RentalReceiptPage() {
  const [receipt] = useState(() => loadLastReceipt());

  if (!receipt) {
    return (
      <Card className="rounded-[30px] p-8 text-center">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Receipt олдсонгүй
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Сүүлд амжилттай буцаасан түрээсийн receipt session storage дээр хадгалагдсан байх ёстой.
        </p>
        <div className="mt-6">
          <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
            <Link href="/rental/history">Түүх харах</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="rounded-[34px] p-6 text-center md:p-10">
        <div className="mx-auto flex size-18 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
          Receipt
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
          Амжилттай буцаагдлаа
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Deposit суллагдаж, түрээсийн мөчлөг дууслаа.
        </p>

        <div className="mt-8 rounded-[28px] bg-[var(--primary-50)] p-6 text-left">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Rental ID", receipt.id],
              ["Power bank", receipt.powerBankId],
              ["Эхэлсэн station", receipt.startStationName],
              ["Буцаасан station", receipt.endStationName],
              ["Эхэлсэн", formatDateTime(receipt.startedAt)],
              ["Дууссан", formatDateTime(receipt.returnedAt)],
              ["Deposit", formatMoney(receipt.depositAmount)],
              ["Charge", receipt.chargeAmount ? formatMoney(receipt.chargeAmount) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] bg-white/90 p-4">
                <p className="text-sm text-[var(--text-muted)]">{label}</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            asChild
            onClick={() => clearLastReceipt()}
          >
            <Link href="/wallet">
              <Wallet className="size-4" />
              Wallet
            </Link>
          </Button>
          <Button
            className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
            asChild
            onClick={() => clearLastReceipt()}
          >
            <Link href="/rental/history">
              <History className="size-4" />
              Түүх рүү
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
