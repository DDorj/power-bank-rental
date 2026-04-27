"use client";

import type { CustomerRentalReceipt } from "@/shared/types/api";

const STORAGE_KEY = "powergo-last-rental-receipt";

function parseReceipt(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CustomerRentalReceipt;
  } catch {
    return null;
  }
}

export function loadLastReceipt() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseReceipt(window.sessionStorage.getItem(STORAGE_KEY));
}

export function saveLastReceipt(receipt: CustomerRentalReceipt) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
}

export function clearLastReceipt() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
