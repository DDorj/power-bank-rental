export function LoadingScreen({
  label = "Уншиж байна...",
}: Readonly<{
  label?: string;
}>) {
  return (
    <div className="app-shell-grid flex min-h-screen items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col items-center rounded-[16px] border bg-white px-8 py-10 text-center shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--foreground)]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--muted)] [animation-delay:120ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--foreground)] [animation-delay:240ms]" />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
          Admin Panel
        </p>
        <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{label}</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Системийн төлөв болон хамгаалалттай route-уудыг шалгаж байна.
        </p>
      </div>
    </div>
  );
}
