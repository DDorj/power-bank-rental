"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/shared/providers/auth-provider";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function OtpScreen({
  phone,
  nextPath,
}: Readonly<{
  phone: string;
  nextPath: string;
}>) {
  const router = useRouter();
  const { loginWithOtp, requestOtp } = useAuth();
  const [code, setCode] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => loginWithOtp(phone, code),
    onSuccess: () => {
      router.replace(nextPath);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => requestOtp(phone),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-8 md:px-6">
      <section className="powergo-card flex flex-col gap-6 p-6 md:p-8">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
          Буцах
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-[18px] bg-[var(--primary-50)] text-[var(--primary-700)]">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
              Verification
            </p>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Кодоо оруулна уу
            </h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--foreground)]">{phone}</span> дугаар руу
          илгээсэн 6 оронтой кодыг оруулна уу.
        </p>

        <Input
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          className="h-14 rounded-[18px] border-white/80 bg-white text-center text-2xl tracking-[0.36em]"
        />

        {loginMutation.error ? (
          <p className="rounded-[14px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Код буруу эсвэл хугацаа нь дууссан байна.
          </p>
        ) : null}

        <Button
          className="h-12 rounded-[16px] bg-[var(--primary-600)] text-base hover:bg-[var(--primary-700)]"
          onClick={() => loginMutation.mutate()}
          disabled={loginMutation.isPending || code.length !== 6 || !phone}
        >
          {loginMutation.isPending ? "Шалгаж байна..." : "Нэвтрэх"}
        </Button>

        <button
          type="button"
          className="text-sm font-medium text-[var(--primary-700)]"
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending || !phone}
        >
          {resendMutation.isPending ? "Дахин илгээж байна..." : "Код дахин авах"}
        </button>
      </section>
    </main>
  );
}
