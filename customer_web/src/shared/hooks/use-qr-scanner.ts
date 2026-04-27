"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScannerStatus = "unsupported" | "idle" | "requesting" | "active" | "blocked" | "error";

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function canUseQrScanner() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof window.BarcodeDetector !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function createDetector() {
  if (!window.BarcodeDetector) {
    return null;
  }

  return new window.BarcodeDetector({
    formats: ["qr_code"],
  });
}

export function useQrScanner({
  onDetected,
}: Readonly<{
  onDetected: (rawValue: string) => void;
}>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const detectInFlightRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<ScannerStatus>(() =>
    canUseQrScanner() ? "idle" : "unsupported",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const dispose = useCallback(() => {
    activeRef.current = false;
    detectInFlightRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const stop = useCallback(() => {
    dispose();
    setStatus(canUseQrScanner() ? "idle" : "unsupported");
  }, [dispose]);

  const tick = useCallback(async function scanFrame() {
    if (!activeRef.current) {
      return;
    }

    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector) {
      dispose();
      setStatus("error");
      setError("QR scanner бэлтгэхэд алдаа гарлаа.");
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || detectInFlightRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
      return;
    }

    detectInFlightRef.current = true;

    try {
      const codes = await detector.detect(video);
      const rawValue = codes.find((code) => code.rawValue?.trim())?.rawValue?.trim();

      if (rawValue) {
        dispose();
        setStatus("idle");
        onDetectedRef.current(rawValue);
        return;
      }
    } catch {
      dispose();
      setStatus("error");
      setError("Камерийн дүрснээс QR танихад алдаа гарлаа.");
      return;
    } finally {
      detectInFlightRef.current = false;
    }

    if (activeRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
    }
  }, [dispose]);

  const start = useCallback(async () => {
    if (!canUseQrScanner()) {
      setStatus("unsupported");
      setError("Таны browser camera QR scan-ийг дэмжихгүй байна.");
      return;
    }

    setError(null);
    setStatus("requesting");

    try {
      detectorRef.current ??= createDetector();

      if (!detectorRef.current) {
        setStatus("unsupported");
        setError("QR detector инициализац хийж чадсангүй.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      const video = videoRef.current;
      streamRef.current = stream;

      if (video) {
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        await video.play();
      }

      activeRef.current = true;
      setStatus("active");
      rafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch (caughtError) {
      dispose();
      if (caughtError instanceof DOMException && caughtError.name === "NotAllowedError") {
        setStatus("blocked");
        setError("Камерийн permission зөвшөөрөгдөөгүй байна.");
        return;
      }

      setStatus("error");
      setError("Камер нээхэд алдаа гарлаа.");
    }
  }, [dispose, tick]);

  const scanFile = useCallback(async (file: File) => {
    if (!window.BarcodeDetector || typeof createImageBitmap === "undefined") {
      throw new Error("Зургаас QR таних боломжгүй browser байна.");
    }

    detectorRef.current ??= createDetector();
    if (!detectorRef.current) {
      throw new Error("QR detector инициализац хийж чадсангүй.");
    }

    const bitmap = await createImageBitmap(file);

    try {
      const codes = await detectorRef.current.detect(bitmap);
      const rawValue = codes.find((code) => code.rawValue?.trim())?.rawValue?.trim();

      if (!rawValue) {
        throw new Error("Энэ зураг дээр QR код олдсонгүй.");
      }

      return rawValue;
    } finally {
      bitmap.close?.();
    }
  }, []);

  useEffect(() => () => {
    dispose();
  }, [dispose]);

  return {
    videoRef,
    status,
    error,
    supported: canUseQrScanner(),
    active: status === "active",
    start,
    stop,
    scanFile,
  };
}
