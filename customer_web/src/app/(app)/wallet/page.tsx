"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CreditCard, History, Wallet } from "lucide-react";
import { createWalletTopup, getWallet } from "@/shared/api/customer";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

const presets = [5000, 10000, 20000];

export default function WalletPage() {
  const queryClient = useQueryClient();
  const walletQuery = useQuery({
    queryKey: ["customer", "wallet"],
    queryFn: getWallet,
  });
  const [amount, setAmount] = useState(10000);

  const topupMutation = useMutation({
    mutationFn: () => createWalletTopup(amount),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer", "wallet"] });
    },
  });

  const wallet = walletQuery.data;
  const invoice = topupMutation.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
      <Card className="powergo-hero rounded-[30px] border-white/14 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              Wallet
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
              {wallet ? formatMoney(wallet.balance) : "..." }
            </h1>
          </div>
          <div className="flex size-14 items-center justify-center rounded-[20px] bg-white/14 backdrop-blur">
            <Wallet className="size-6 text-white" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur">
            <p className="text-sm text-white/72">Боломжтой үлдэгдэл</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {wallet ? formatMoney(wallet.availableBalance) : "—"}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/14 bg-white/12 p-4 backdrop-blur">
            <p className="text-sm text-white/72">Блоклогдсон</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {wallet ? formatMoney(wallet.frozenAmount) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="secondary" asChild>
            <Link href="/wallet/transactions">
              <History className="size-4" />
              Гүйлгээ харах
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="rounded-[30px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
          Top-up
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Цэнэглэх дүн сонгох
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`rounded-[20px] px-4 py-4 text-left text-sm font-medium transition ${
                amount === preset
                  ? "bg-[var(--primary-600)] text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
                  : "bg-slate-50 text-[var(--foreground)]"
              }`}
              onClick={() => setAmount(preset)}
            >
              {formatMoney(preset)}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-[var(--foreground)]">Custom amount</span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mt-2 h-12 w-full rounded-[18px] border border-white/70 bg-white px-4 outline-none"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
            onClick={() => topupMutation.mutate()}
            disabled={topupMutation.isPending || amount < 1000}
          >
            <CreditCard className="size-4" />
            {topupMutation.isPending ? "Үүсгэж байна..." : "Top-up invoice үүсгэх"}
          </Button>
        </div>

        {invoice ? (
          <div className="mt-6 rounded-[24px] bg-[var(--primary-50)] p-5">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              Invoice #{invoice.invoiceId}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {formatMoney(invoice.amount)} · дуусах хугацаа {formatDateTime(invoice.expiresAt)}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]">
                <a href={invoice.followUpLink} target="_blank" rel="noreferrer">
                  Bonum руу үргэлжлүүлэх
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/wallet/transactions">Төлөв шалгах</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
