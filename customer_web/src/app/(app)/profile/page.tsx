"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleUserRound, History, LogOut, Wallet } from "lucide-react";
import { getMe } from "@/shared/api/customer";
import { formatDateTime } from "@/shared/lib/format";
import { kycStatusLabels, statusTone } from "@/shared/lib/status";
import { useAuth } from "@/shared/providers/auth-provider";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["customer", "me"],
    queryFn: getMe,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      router.replace("/login");
    },
  });

  const profile = profileQuery.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
      <Card className="rounded-[30px] p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-[22px] bg-[var(--primary-50)] text-[var(--primary-700)]">
            <CircleUserRound className="size-7" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
              Profile
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {profile?.name ?? "Хэрэглэгч"}
            </h1>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Утас</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">{profile?.phone ?? "—"}</p>
          </div>
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Нэвтрэх арга</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">{profile?.primaryAuthMethod ?? "—"}</p>
          </div>
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">Trust tier</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">{profile?.trustTier ?? "—"}</p>
          </div>
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-sm text-[var(--text-muted)]">KYC</p>
            {profile ? (
              <div className="mt-2">
                <Badge tone={statusTone(profile.kycStatus)}>{kycStatusLabels[profile.kycStatus]}</Badge>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-[22px] bg-[var(--primary-50)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Бүртгүүлсэн огноо</p>
          <p className="mt-2 font-semibold text-[var(--foreground)]">
            {formatDateTime(profile?.createdAt)}
          </p>
        </div>
      </Card>

      <Card className="rounded-[30px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
          Shortcuts
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Товч холбоосууд
        </h2>

        <div className="mt-5 grid gap-3">
          <Button variant="secondary" asChild>
            <a href="/wallet">
              <Wallet className="size-4" />
              Wallet
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="/rental/history">
              <History className="size-4" />
              Түрээсийн түүх
            </a>
          </Button>
          <Button
            variant="danger"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="size-4" />
            {logoutMutation.isPending ? "Гарч байна..." : "Гарах"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
