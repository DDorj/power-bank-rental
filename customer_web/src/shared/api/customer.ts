"use client";

import { request } from "@/shared/api/http";
import type {
  AppHomeSummary,
  AppRentalPreview,
  AppScanResolveResult,
  CustomerStationDetail,
  CustomerRental,
  CustomerRentalReceipt,
  NearbyStation,
  OtpVerifyPayload,
  ReturnStationOption,
  UserIdentity,
  WalletSummary,
  WalletTopupInvoice,
  WalletTransactionPage,
} from "@/shared/types/api";

type LocationQuery = {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
};

function toSearch(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function requestOtp(phone: string) {
  return request<{ expiresAt: string }>("/auth/otp/request", {
    method: "POST",
    auth: false,
    body: { phone },
  });
}

export function verifyOtp(phone: string, code: string) {
  return request<OtpVerifyPayload>("/auth/otp/verify", {
    method: "POST",
    auth: false,
    headers: {
      "x-client-type": "app",
    },
    body: { phone, code },
  });
}

export function logout(refreshToken: string) {
  return request<void>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export function getMe() {
  return request<UserIdentity>("/users/me");
}

export function getHomeSummary(params: LocationQuery) {
  return request<AppHomeSummary>(`/app/home/summary${toSearch(params)}`);
}

export function getNearbyStations(params: LocationQuery) {
  return request<NearbyStation[]>(`/stations/nearby${toSearch(params)}`, {
    auth: false,
  });
}

export function getStation(id: string) {
  return request<CustomerStationDetail>(`/stations/${id}`, {
    auth: false,
  });
}

export function getWallet() {
  return request<WalletSummary>("/wallet");
}

export function getWalletTransactions(page = 1, limit = 20) {
  return request<WalletTransactionPage>(
    `/wallet/transactions${toSearch({ page, limit })}`,
  );
}

export function createWalletTopup(amount: number) {
  return request<WalletTopupInvoice>("/wallet/topup", {
    method: "POST",
    body: { amount },
  });
}

export function resolveQr(qrData: string) {
  return request<AppScanResolveResult>("/app/scan/resolve", {
    method: "POST",
    body: { qrData },
  });
}

export function previewRental(stationId: string, slotId: string) {
  return request<AppRentalPreview>("/app/scan/preview-rental", {
    method: "POST",
    body: { stationId, slotId },
  });
}

export function startRental(stationId: string, slotId: string) {
  return request<CustomerRental>("/rentals/start", {
    method: "POST",
    body: { stationId, slotId },
  });
}

export function startRentalAutoSelect(stationId: string) {
  return request<CustomerRental>("/rentals/start/auto-select", {
    method: "POST",
    body: { stationId },
  });
}

export function getActiveRental() {
  return request<CustomerRental | null>("/rentals/active");
}

export function getRentalHistory(page = 1, limit = 20) {
  return request<{ data: CustomerRental[]; total: number }>(
    `/rentals/history${toSearch({ page, limit })}`,
  );
}

export function getReturnStations(rentalId: string, params: LocationQuery) {
  return request<ReturnStationOption[]>(
    `/rentals/${rentalId}/return-stations${toSearch(params)}`,
  );
}

export function returnRentalAutoSelect(rentalId: string, stationId: string) {
  return request<CustomerRental>(`/rentals/${rentalId}/return/auto-select`, {
    method: "POST",
    body: { stationId },
  });
}

export function toReceiptSnapshot(input: {
  rental: CustomerRental;
  startStationName?: string | null;
  endStationName?: string | null;
}) {
  const { rental, startStationName, endStationName } = input;

  return {
    id: rental.id,
    status: rental.status,
    powerBankId: rental.powerBankId,
    startStationId: rental.startStationId,
    startStationName: startStationName ?? rental.startStationId,
    endStationId: rental.endStationId,
    endStationName: endStationName ?? rental.endStationId ?? "—",
    depositAmount: rental.depositAmount,
    chargeAmount: rental.chargeAmount,
    startedAt: rental.startedAt,
    returnedAt: rental.returnedAt,
  } satisfies CustomerRentalReceipt;
}
