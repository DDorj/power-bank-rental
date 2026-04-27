"use client";

import { env } from "@/shared/config/env";
import { clearSession, getSession, setSession } from "@/shared/lib/auth-store";
import type { ApiErrorEnvelope, ApiSuccessEnvelope, AuthTokens } from "@/shared/types/api";

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(payload: { code: string; message: string; statusCode: number }) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.statusCode = payload.statusCode;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  headers?: HeadersInit;
};

let refreshPromise: Promise<boolean> | null = null;

function makeUrl(path: string) {
  return `${env.apiBaseUrl}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const json = text ? (JSON.parse(text) as ApiSuccessEnvelope<T> | ApiErrorEnvelope) : null;

  if (!response.ok) {
    const fallback = {
      code: "HTTP_ERROR",
      message: "Хүсэлт боловсруулахад алдаа гарлаа",
      statusCode: response.status,
    };

    throw new ApiError(
      json && "success" in json && json.success === false
        ? json
        : fallback,
    );
  }

  if (json && "success" in json && json.success === true) {
    return json.data;
  }

  return json as T;
}

async function refreshTokens() {
  const current = getSession();

  if (!current?.refreshToken) {
    clearSession();
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(makeUrl("/auth/refresh"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken: current.refreshToken,
          }),
        });

        const refreshed = await parseResponse<AuthTokens>(response);
        setSession({
          ...current,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    auth = true,
    body,
    retryOnUnauthorized = true,
    headers,
    ...rest
  } = options;

  const session = getSession();
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth && session?.accessToken) {
    requestHeaders.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(makeUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return request<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  return parseResponse<T>(response);
}
