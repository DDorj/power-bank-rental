"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Home,
  MapPinned,
  QrCode,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { getActiveRental } from "@/shared/api/customer";
import { formatDurationSince } from "@/shared/lib/format";
import { useAuth } from "@/shared/providers/auth-provider";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { cn } from "@/shared/lib/utils";

const navigation = [
  { href: "/home", label: "Нүүр", icon: Home },
  { href: "/stations", label: "Станц", icon: MapPinned },
  { href: "/scan", label: "QR", icon: QrCode },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Би", icon: UserRound },
] as const;

export function CustomerShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { initialized, session } = useAuth();
  const { data: activeRental } = useQuery({
    queryKey: ["customer", "active-rental", session?.user.id],
    queryFn: getActiveRental,
    enabled: Boolean(session),
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/home")}`);
    }
  }, [initialized, pathname, router, session]);

  if (!initialized || !session) {
    return <LoadingScreen label="Нэвтрэх эрх шалгаж байна..." />;
  }

  return (
    <div className="powergo-shell">
      <div className="powergo-shell__inner">
        <header className="powergo-card mb-4 flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/home" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[16px] bg-[var(--primary-600)] text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                PowerGo
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                Web Rental
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[var(--foreground)] text-white"
                      : "text-[var(--text-muted)] hover:bg-white/80",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden rounded-full bg-[var(--primary-50)] px-4 py-2 text-sm font-medium text-[var(--primary-700)] md:block">
            {session.user.name}
          </div>
        </header>

        {activeRental ? (
          <Link
            href="/rental/active"
            className="powergo-hero mb-4 flex items-center justify-between gap-4 rounded-[24px] px-5 py-4 shadow-[0_16px_32px_rgba(37,99,235,0.22)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[18px] bg-white/16 backdrop-blur">
                <Zap className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/72">
                  Идэвхтэй түрээс
                </p>
                <p className="mt-1 text-base font-semibold text-white">
                  {formatDurationSince(activeRental.startedAt)} явж байна
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-white/16 px-4 py-2 text-sm font-medium md:flex">
              <History className="size-4" />
              Дэлгэрэнгүй
            </div>
          </Link>
        ) : null}

        <main className="powergo-page">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/86 px-2 py-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-medium transition",
                  active
                    ? "bg-[var(--primary-600)] text-white shadow-[0_10px_20px_rgba(37,99,235,0.24)]"
                    : "text-[var(--text-dim)]",
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
