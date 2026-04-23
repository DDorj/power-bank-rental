import type { ReactNode } from "react";
import { Card } from "@/shared/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}>) {
  return (
    <Card className="metric-glow rounded-[16px] p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
            {label}
          </p>
          <p className="text-[2rem] font-semibold leading-none tracking-tight md:text-[2.25rem]">
            {value}
          </p>
          {hint ? (
            <p className="max-w-[16rem] text-sm leading-5 text-[var(--muted)]">
              {hint}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div className="shrink-0 rounded-[10px] border border-[color:var(--line)] bg-[var(--accent-bg)] p-2.5 text-[var(--accent)]">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
