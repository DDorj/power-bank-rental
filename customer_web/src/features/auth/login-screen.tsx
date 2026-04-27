"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Smartphone, Zap } from "lucide-react";
import { useAuth } from "@/shared/providers/auth-provider";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function LoginScreen({
  nextPath,
}: Readonly<{
  nextPath: string;
}>) {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState("+976");

  const otpMutation = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: () => {
      const params = new URLSearchParams({
        phone,
        next: nextPath,
      });

      router.push(`/otp?${params.toString()}`);
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-6 px-4 py-8 md:px-6">
      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="powergo-card powergo-hero flex flex-col justify-between gap-8 p-6 md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[18px] bg-white/14 backdrop-blur">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/68">
                PowerGo
              </p>
              <h1 className="text-2xl font-semibold text-white md:text-4xl">
                Ойролцоох station-оос power bank түрээслэ
              </h1>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              "Station хайж олох",
              "Wallet цэнэглэх",
              "QR-аар шууд эхлүүлэх",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-white/18 bg-white/12 px-4 py-4 text-sm font-medium text-white/88 backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="powergo-card flex flex-col justify-center gap-6 p-6 md:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
              Phone OTP
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              Нэвтрэх код аваарай
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Утасны дугаараа оруулаад нэг удаагийн код авч нэвтэрнэ.
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Утасны дугаар
            </span>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-dim)]" />
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+97699112233"
                className="h-12 rounded-[16px] border-white/80 bg-white pl-10"
              />
            </div>
          </label>

          {otpMutation.error ? (
            <p className="rounded-[14px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Код илгээхэд алдаа гарлаа. Утасны дугаараа шалгаад дахин оролдоно уу.
            </p>
          ) : null}

          <Button
            className="h-12 rounded-[16px] bg-[var(--primary-600)] text-base hover:bg-[var(--primary-700)]"
            onClick={() => otpMutation.mutate()}
            disabled={otpMutation.isPending || phone.trim().length < 8}
          >
            {otpMutation.isPending ? "Илгээж байна..." : "Код авах"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </main>
  );
}
