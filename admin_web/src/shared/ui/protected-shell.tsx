"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/providers/auth-provider";
import { Button } from "@/shared/ui/button";
import { LoadingScreen } from "@/shared/ui/loading-screen";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stations", label: "Stations", icon: MapPinned },
  { href: "/users", label: "Users", icon: Users },
  { href: "/rentals", label: "Rentals", icon: Activity },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/power-banks", label: "Power Banks", icon: BatteryCharging },
];

export function ProtectedShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { initialized, session, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [initialized, pathname, router, session]);

  const activeLabel = useMemo(
    () =>
      navigation.find((item) =>
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname?.startsWith(item.href),
      )?.label || "Admin",
    [pathname],
  );

  if (!initialized || !session) {
    return <LoadingScreen label="Нэвтрэх эрх шалгаж байна..." />;
  }

  return (
    <div className="app-shell-grid min-h-screen">
      <div className="flex min-h-screen items-stretch">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-[296px] border-r bg-white transition md:sticky md:top-0 md:h-screen md:w-[264px] md:shrink-0 md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-[120%]",
          )}
        >
          <div className="flex h-full min-h-0 flex-col p-4">
            <div className="border-b border-[color:var(--line)] pb-4">
              <div className="flex items-center justify-center px-2 py-1.5">
                <Image
                  src="/admin-logo.svg"
                  alt="Power Bank Rental admin logo"
                  width={184}
                  height={56}
                  priority
                  className="h-10 w-auto"
                />
              </div>
            </div>

            <nav className="mt-4 flex-1 space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-[var(--foreground)] hover:bg-slate-50",
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-[8px]",
                        active
                          ? "bg-white/10 text-white"
                          : "bg-slate-100 text-[var(--ink-soft)]",
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-left leading-none",
                        active ? "text-white" : "text-[var(--foreground)]",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <Button
              variant="secondary"
              className="mt-4 h-11 w-full justify-start px-3 text-[14px]"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 size-4" />
              Logout
            </Button>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            aria-label="close menu"
            className="fixed inset-0 z-20 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="dash-orbit flex min-w-0 flex-1 flex-col">
          <header className="fade-up sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-2.5 py-1.5 backdrop-blur md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  Admin Panel
                </p>
                <p className="truncate text-sm font-medium text-[var(--foreground)]">
                  {activeLabel}
                </p>
              </div>
            </div>
            <div className="rounded-[8px] border border-[color:var(--line)] bg-slate-50 px-2.5 py-1 text-xs font-medium text-[var(--ink-soft)]">
              {session.user.name}
            </div>
          </header>

          <main className="fade-up-delay flex-1 px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
