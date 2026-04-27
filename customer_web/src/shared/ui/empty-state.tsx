import type { ReactNode } from "react";
import { Card } from "@/shared/ui/card";

export function EmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <Card className="rounded-[16px] bg-white px-8 py-10 text-center">
      <div className="mx-auto max-w-lg space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
          Empty Result
        </p>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
