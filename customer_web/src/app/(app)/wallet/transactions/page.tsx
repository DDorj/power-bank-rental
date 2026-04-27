"use client";

import { useQuery } from "@tanstack/react-query";
import { getWalletTransactions } from "@/shared/api/customer";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { walletTypeLabels } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

export default function WalletTransactionsPage() {
  const transactionsQuery = useQuery({
    queryKey: ["customer", "wallet-transactions"],
    queryFn: () => getWalletTransactions(1, 20),
  });

  return (
    <Card className="rounded-[30px] p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
        Transactions
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
        Wallet гүйлгээ
      </h1>

      <div className="mt-6 overflow-x-auto">
        <table className="powergo-table min-w-full">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">
              <th>Төрөл</th>
              <th>Дүн</th>
              <th>Тайлбар</th>
              <th>Огноо</th>
            </tr>
          </thead>
          <tbody>
            {transactionsQuery.data?.data.map((item) => (
              <tr key={item.id}>
                <td>
                  <Badge>{walletTypeLabels[item.type]}</Badge>
                </td>
                <td className="font-semibold text-[var(--foreground)]">
                  {formatMoney(item.amount)}
                </td>
                <td className="text-sm text-[var(--text-muted)]">{item.description || "—"}</td>
                <td className="text-sm text-[var(--text-muted)]">{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
