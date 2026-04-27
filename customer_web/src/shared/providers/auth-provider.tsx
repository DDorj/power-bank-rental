"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  logout as logoutApi,
  requestOtp as requestOtpApi,
  verifyOtp as verifyOtpApi,
} from "@/shared/api/customer";
import {
  clearSession,
  getSession,
  setSession,
  subscribeSession,
  type Session,
} from "@/shared/lib/auth-store";

interface AuthContextValue {
  initialized: boolean;
  session: Session | null;
  requestOtp: (phone: string) => Promise<{ expiresAt: string }>;
  loginWithOtp: (phone: string, code: string) => Promise<Session>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    () => undefined,
  );
  const initialized = session !== undefined;

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      session: session ?? null,
      requestOtp: requestOtpApi,
      async loginWithOtp(phone, code) {
        const payload = await verifyOtpApi(phone, code);
        const nextSession = {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          user: payload.user,
        };
        setSession(nextSession);
        return nextSession;
      },
      async logout() {
        const current = getSession();
        try {
          if (current?.refreshToken) {
            await logoutApi(current.refreshToken);
          }
        } finally {
          clearSession();
        }
      },
    }),
    [initialized, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
