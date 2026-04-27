import type { UserIdentity } from "@/shared/types/api";

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserIdentity;
}

const STORAGE_KEY = "powergo-customer-session";

let sessionState: Session | null | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function parseSession(raw: string | null): Session | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function loadSession() {
  if (typeof window === "undefined") {
    return sessionState;
  }

  sessionState = parseSession(window.localStorage.getItem(STORAGE_KEY));
  return sessionState;
}

export function getSession() {
  if (sessionState === undefined) {
    return loadSession();
  }

  return sessionState;
}

export function setSession(session: Session) {
  sessionState = session;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  emit();
}

export function clearSession() {
  sessionState = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
