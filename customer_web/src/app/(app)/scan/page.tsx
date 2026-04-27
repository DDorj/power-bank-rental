"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageUp, QrCode, ScanLine, Wallet, Zap } from "lucide-react";
import {
  previewRental,
  resolveQr,
  startRental,
  startRentalAutoSelect,
} from "@/shared/api/customer";
import { formatMoney } from "@/shared/lib/format";
import { useQrScanner } from "@/shared/hooks/use-qr-scanner";
import { stationStatusLabels, statusTone } from "@/shared/lib/status";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

const DEMO_QR = '{"stationId":"9fad2ae8-be5e-40ac-b1f2-4e782a945fd2","slotId":"slot-uuid"}';

export default function ScanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [qrData, setQrData] = useState(DEMO_QR);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveMutation = useMutation({
    mutationFn: (payload: string) => resolveQr(payload),
  });

  const previewMutation = useMutation({
    mutationFn: ({
      stationId,
      slotId,
    }: {
      stationId: string;
      slotId: string;
    }) => {
      const station = resolveMutation.data?.station;
      if (!station) {
        throw new Error("Station not resolved");
      }

      return previewRental(stationId, slotId);
    },
  });

  const startExactMutation = useMutation({
    mutationFn: () => {
      const preview = previewMutation.data;
      if (!preview) {
        throw new Error("Rental preview байхгүй байна");
      }

      return startRental(preview.stationId, preview.slotId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer", "active-rental"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "wallet"] }),
      ]);
      router.push("/rental/active");
    },
  });

  const startAutoMutation = useMutation({
    mutationFn: () => {
      const station = resolveMutation.data?.station;
      if (!station) {
        throw new Error("Station not resolved");
      }

      return startRentalAutoSelect(station.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer", "active-rental"] }),
        queryClient.invalidateQueries({ queryKey: ["customer", "home"] }),
      ]);
      router.push("/rental/active");
    },
  });

  const resetNextSteps = useCallback(() => {
    previewMutation.reset();
    startExactMutation.reset();
    startAutoMutation.reset();
  }, [previewMutation, startAutoMutation, startExactMutation]);

  const handleResolve = useCallback(
    (payload: string) => {
      const nextPayload = payload.trim();
      if (!nextPayload) {
        return;
      }

      setQrData(nextPayload);
      resetNextSteps();
      resolveMutation.mutate(nextPayload);
    },
    [resetNextSteps, resolveMutation],
  );

  const scanner = useQrScanner({
    onDetected: handleResolve,
  });
  const {
    videoRef,
    status: scannerStatus,
    error: scannerError,
    supported: scannerSupported,
    active: scannerActive,
    start: startScanner,
    stop: stopScanner,
    scanFile,
  } = scanner;

  const scanFileMutation = useMutation({
    mutationFn: (file: File) => scanFile(file),
    onSuccess: (payload) => {
      handleResolve(payload);
    },
  });

  const resolved = resolveMutation.data;
  const preview = previewMutation.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="powergo-hero rounded-[30px] border-white/16 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-[18px] bg-white/14 backdrop-blur">
            <ScanLine className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              QR Flow
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">QR уншуулах</h1>
          </div>
        </div>

        <div className="mt-10 rounded-[28px] border border-white/14 bg-white/10 p-5 backdrop-blur">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-white/25 bg-black/10">
            {scannerActive ? (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <div className="absolute inset-8 rounded-[28px] border-2 border-white/75" />
                <div className="absolute left-10 right-10 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--primary-300)] shadow-[0_0_24px_rgba(147,197,253,0.9)]" />
              </>
            ) : (
              <div className="text-center text-white/78">
                <QrCode className="mx-auto size-10" />
                <p className="mt-4 text-sm">
                  {scannerSupported
                    ? "Mobile browser дээр camera scan, desktop дээр image/manual fallback ашиглана."
                    : "Энэ browser camera QR scan-ийг дэмжихгүй байна. Доорх fallback-уудыг ашиглана."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {scannerActive ? (
              <Button variant="secondary" onClick={stopScanner}>
                Camera зогсоох
              </Button>
            ) : (
              <Button
                className="rounded-[16px] bg-white text-[var(--foreground)] hover:bg-white/90"
                onClick={() => void startScanner()}
                disabled={!scannerSupported || resolveMutation.isPending}
              >
                <Camera className="size-4" />
                {scannerStatus === "requesting" ? "Camera асууж байна..." : "Camera эхлүүлэх"}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanFileMutation.isPending}
            >
              <ImageUp className="size-4" />
              {scanFileMutation.isPending ? "Зураг шалгаж байна..." : "QR зураг оруулах"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  scanFileMutation.mutate(file);
                }
                event.target.value = "";
              }}
            />
          </div>

          <div className="mt-4 space-y-2 text-sm text-white/82">
            <p>
              {scannerActive
                ? "QR код камерыг чиглүүлэн scan хийнэ. Танигдмагц автоматаар resolve болно."
                : scannerStatus === "blocked"
                  ? "Camera permission хаалттай байна. Browser settings дээр зөвшөөрөөд дахин оролдоно уу."
                  : "Station дээрх QR кодыг camera, зураг эсвэл manual payload-аар оруулж болно."}
            </p>
            {scannerError ? <p className="text-rose-200">{scannerError}</p> : null}
            {scanFileMutation.error ? (
              <p className="text-rose-200">
                {scanFileMutation.error instanceof Error
                  ? scanFileMutation.error.message
                  : "Зураг дээрээс QR танихад алдаа гарлаа."}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="rounded-[30px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
          Manual Fallback
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          QR payload оруулах
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Desktop дээр QR string paste хийж resolve хийнэ. Demo payload default-оор тавигдсан.
        </p>

        <textarea
          value={qrData}
          onChange={(event) => setQrData(event.target.value)}
          className="mt-5 min-h-[130px] w-full rounded-[22px] border border-white/80 bg-white p-4 text-sm outline-none"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
            onClick={() => handleResolve(qrData)}
            disabled={resolveMutation.isPending || !qrData.trim()}
          >
            {resolveMutation.isPending ? "Таниж байна..." : "Resolve хийх"}
          </Button>
          <Button variant="secondary" onClick={() => setQrData(DEMO_QR)}>
            Demo QR
          </Button>
        </div>

        {resolved ? (
          <div className="mt-6 rounded-[24px] bg-[var(--primary-50)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">{resolved.station.name}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{resolved.station.address}</p>
              </div>
              <Badge tone={statusTone(resolved.station.status)}>
                {stationStatusLabels[resolved.station.status]}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] bg-white/86 p-4">
                <p className="text-sm text-[var(--text-muted)]">Wallet боломжтой</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {formatMoney(resolved.wallet.availableBalance)}
                </p>
              </div>
              <div className="rounded-[18px] bg-white/86 p-4">
                <p className="text-sm text-[var(--text-muted)]">Станцын төлөв</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {resolved.reason}
                </p>
              </div>
            </div>

            {resolved.detectedSlot ? (
              <div className="mt-4 rounded-[18px] bg-white/86 p-4">
                <p className="text-sm text-[var(--text-muted)]">Detected slot</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  #{resolved.detectedSlot.slotIndex} · {resolved.detectedSlot.status}
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {resolved.detectedSlot ? (
                <Button
                  onClick={() =>
                    previewMutation.mutate({
                      stationId: resolved.station.id,
                      slotId: resolved.detectedSlot!.id,
                    })
                  }
                  disabled={previewMutation.isPending || !resolved.detectedSlot.isRentable}
                  className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
                >
                  {previewMutation.isPending ? "Preview..." : "Үнэ/депозит харах"}
                </Button>
              ) : null}

              {resolved.canStartRental && !resolved.detectedSlot ? (
                <Button variant="secondary" onClick={() => startAutoMutation.mutate()} disabled={startAutoMutation.isPending}>
                  {startAutoMutation.isPending ? "Эхлүүлж байна..." : "Auto-select эхлүүлэх"}
                </Button>
              ) : null}

              <Button variant="secondary" asChild>
                <a href="/wallet">
                  <Wallet className="size-4" />
                  Wallet
                </a>
              </Button>
            </div>
          </div>
        ) : null}

        {preview ? (
          <div className="mt-6 rounded-[24px] border border-[var(--border)] p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-[16px] bg-[var(--primary-50)] text-[var(--primary-700)]">
                <Zap className="size-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {preview.powerBankSerialNumber}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Slot #{preview.slotIndex} · charge {preview.powerBankChargeLevel}%
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm text-[var(--text-muted)]">Deposit</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {formatMoney(preview.depositAmount)}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm text-[var(--text-muted)]">Цагийн үнэ</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {formatMoney(preview.ratePerHour)}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm text-[var(--text-muted)]">Balance check</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {preview.sufficientBalance ? "Хангалттай" : "Дутуу"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Button
                className="rounded-[16px] bg-[var(--primary-600)] hover:bg-[var(--primary-700)]"
                onClick={() => startExactMutation.mutate()}
                disabled={startExactMutation.isPending || !preview.canStartRental}
              >
                {startExactMutation.isPending ? "Эхлүүлж байна..." : "Түрээс эхлүүлэх"}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
