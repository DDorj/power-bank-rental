import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>) {
  return (
    <div className="border-b border-[color:var(--line)] pb-3">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <div className="inline-flex items-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                {eyebrow}
              </p>
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
            <h1 className="max-w-3xl truncate text-[1.55rem] font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-[1.7rem]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl truncate text-sm leading-5 text-[var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-1.5 md:justify-end">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
