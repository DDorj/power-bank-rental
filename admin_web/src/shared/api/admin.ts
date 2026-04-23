"use client";

import { request } from "@/shared/api/http";
import type {
  AdminPayment,
  AdminPaymentDetail,
  AdminPowerBank,
  AdminRental,
  AdminUserDetail,
  AdminUserListItem,
  AdminWalletTransaction,
  CreateStationInput,
  DashboardOverview,
  OtpVerifyPayload,
  PaginationResult,
  PaymentStatus,
  PowerBankStatus,
  RentalStatus,
  StationDetail,
  StationListItem,
  UpdateStationInput,
  WalletTransactionType,
} from "@/shared/types/api";

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
      "x-client-type": "admin",
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

export function getDashboardOverview() {
  return request<DashboardOverview>("/admin/dashboard/overview");
}

export function getStations() {
  return request<StationListItem[]>("/admin/stations");
}

export function createStation(input: CreateStationInput) {
  return request<StationDetail>("/admin/stations", {
    method: "POST",
    body: input,
  });
}

export function updateStation(id: string, input: UpdateStationInput) {
  return request<StationDetail>(`/admin/stations/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteStation(id: string) {
  return request<void>(`/admin/stations/${id}`, {
    method: "DELETE",
  });
}

type ListParams = {
  page: number;
  limit: number;
  query?: string;
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

export function getUsers(params: ListParams & { role?: "user" | "admin" }) {
  return request<PaginationResult<AdminUserListItem>>(
    `/admin/dashboard/users${toSearch(params)}`,
  );
}

export function getUser(id: string) {
  return request<AdminUserDetail>(`/admin/dashboard/users/${id}`);
}

export function getRentals(params: ListParams & { status?: RentalStatus }) {
  return request<PaginationResult<AdminRental>>(
    `/admin/dashboard/rentals${toSearch(params)}`,
  );
}

export function getRental(id: string) {
  return request<AdminRental>(`/admin/dashboard/rentals/${id}`);
}

export function getPayments(
  params: ListParams & {
    status?: PaymentStatus;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return request<PaginationResult<AdminPayment>>(
    `/admin/dashboard/payments${toSearch(params)}`,
  );
}

export function getPayment(id: string) {
  return request<AdminPaymentDetail>(`/admin/dashboard/payments/${id}`);
}

export function getWalletTransactions(
  params: ListParams & {
    type?: WalletTransactionType;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return request<PaginationResult<AdminWalletTransaction>>(
    `/admin/dashboard/wallet/transactions${toSearch(params)}`,
  );
}

export function getPowerBanks(
  params: ListParams & {
    status?: PowerBankStatus;
  },
) {
  return request<PaginationResult<AdminPowerBank>>(
    `/admin/dashboard/power-banks${toSearch(params)}`,
  );
}

export function getPowerBank(id: string) {
  return request<AdminPowerBank>(`/admin/dashboard/power-banks/${id}`);
}
