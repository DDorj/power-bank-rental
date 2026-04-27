export function LoadingScreen({
  label = "Уншиж байна...",
}: Readonly<{
  label?: string;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="powergo-card flex w-full max-w-md flex-col items-center px-8 py-10 text-center">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary-600)]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary-300)] [animation-delay:120ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary-600)] [animation-delay:240ms]" />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--text-dim)]">
          PowerGo
        </p>
        <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{label}</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
          Wallet, station болон түрээсийн мэдээллийг ачаалж байна.
        </p>
      </div>
    </div>
  );
}
