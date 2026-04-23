export function KeyValueGrid({
  items,
}: Readonly<{
  items: Array<{ label: string; value: React.ReactNode }>;
}>) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="panel-strong rounded-3xl p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {item.label}
          </dt>
          <dd className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
