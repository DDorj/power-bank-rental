"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Waypoints } from "lucide-react";
import { useAuth } from "@/shared/providers/auth-provider";
import { getErrorMessage } from "@/shared/lib/error";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

const schema = z.object({
  phone: z.string().regex(/^\+976\d{8}$/, "+976XXXXXXXX форматаар оруулна уу"),
  code: z
    .string()
    .length(6, "6 оронтой код оруулна уу")
    .regex(/^\d{6}$/, "6 оронтой тоо оруулна уу"),
});

type FormValues = z.infer<typeof schema>;

const signalCards = [
  {
    title: "Realtime хяналт",
    text: "Stations, rentals, payments, wallet урсгал нэг самбар дээр төвлөрнө.",
  },
  {
    title: "Operational CRUD",
    text: "Admin хэрэглэгч station болон entity мэдээллийг хурдан засварлана.",
  },
  {
    title: "Audit view",
    text: "Users, rentals, payments мөр бүрийг шүүж шалгах боломжтой.",
  },
];

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithOtp, requestOtp } = useAuth();
  const [requestState, setRequestState] = useState<{
    loading: boolean;
    message: string | null;
    error: string | null;
  }>({ loading: false, message: null, error: null });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: "+976",
      code: "",
    },
  });

  const nextUrl = useMemo(
    () => searchParams.get("next") || "/dashboard",
    [searchParams],
  );

  const phone = useWatch({
    control: form.control,
    name: "phone",
  });

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[16px] border bg-white p-6 shadow-sm md:p-8">
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-[color:var(--line)] bg-[var(--accent-bg)] px-3 py-1.5">
            <Waypoints className="size-4 text-[var(--accent)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
              Power Bank Admin
            </p>
          </div>

          <div className="mt-6 max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
              Энгийн, цэвэр admin access.
            </h1>
            <p className="text-sm leading-7 text-[var(--ink-soft)] md:text-base">
              Power bank rental системийн хяналт, жагсаалт, CRUD flow-уудыг нэг
              минимал интерфэйс дээр ажиллуулна.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {signalCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-4"
              >
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <div className="rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                Demo Admin
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                +97699000001
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Локал seed admin хэрэглэгч. OTP verify үед `x-client-type: admin`
                audience ашиглана.
              </p>
            </div>

            <div className="rounded-[14px] border border-[color:var(--line)] bg-slate-50 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                Access Note
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Admin token зөвхөн `admin` role-той хэрэглэгчид олгогдоно.
                Энгийн user дугаараар нэвтрэхэд `403 ADMIN_AUDIENCE_FORBIDDEN`
                буцна.
              </p>
            </div>
          </div>
        </section>

        <Card className="flex items-center p-6 shadow-sm md:p-8">
          <div className="w-full space-y-6">
            <div className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-[12px] bg-[var(--accent-bg)] text-[var(--accent)]">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  Restricted Access
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Admin login
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  OTP-ээр баталгаажсан admin session үүсгэнэ.
                </p>
              </div>
            </div>

            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                setSubmitError(null);
                try {
                  await loginWithOtp(values.phone, values.code);
                  router.replace(nextUrl);
                } catch (error) {
                  setSubmitError(getErrorMessage(error));
                }
              })}
            >
              <Field label="Утасны дугаар" error={form.formState.errors.phone?.message}>
                <Input placeholder="+97699112233" {...form.register("phone")} />
              </Field>

              <Field
                label="Нэг удаагийн код"
                error={form.formState.errors.code?.message}
                hint="6 оронтой"
              >
                <Input
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  {...form.register("code")}
                />
              </Field>

              {submitError ? (
                <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                  {submitError}
                </p>
              ) : null}

              {requestState.message ? (
                <p className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                  {requestState.message}
                </p>
              ) : null}

              {requestState.error ? (
                <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                  {requestState.error}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={requestState.loading}
                  onClick={async () => {
                    setRequestState({ loading: true, message: null, error: null });
                    try {
                      const result = await requestOtp(phone);
                      setRequestState({
                        loading: false,
                        message: `Код илгээлээ. Хүчинтэй хугацаа: ${new Date(
                          result.expiresAt,
                        ).toLocaleTimeString("mn-MN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`,
                        error: null,
                      });
                    } catch (error) {
                      setRequestState({
                        loading: false,
                        message: null,
                        error: getErrorMessage(error),
                      });
                    }
                  }}
                >
                  {requestState.loading ? "Илгээж байна..." : "OTP авах"}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Нэвтэрч байна..." : "Нэвтрэх"}
                </Button>
              </div>
            </form>

            <div className="rounded-[12px] border border-[color:var(--line)] bg-slate-50 p-4 text-sm leading-6 text-[var(--muted)]">
              Demo admin access:
              <span className="ml-2 font-semibold text-[var(--foreground)]">
                +97699000001
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
