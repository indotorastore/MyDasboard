import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "__Host-ruangku-session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export type TradingAccessStatus = "pending" | "trial" | "active" | "expired";

export type UserSession = {
  uid: string;
  email: string | null;
  displayName: string | null;
  username: string;
  role: "admin" | "user";
  tradingAccess: {
    status: TradingAccessStatus;
    expiresAt: string | null;
  };
};

export function resolveTradingAccessStatus(
  role: "admin" | "user",
  storedStatus: unknown,
  expiresAt: Date | null,
): TradingAccessStatus {
  if (role === "admin") return "active";
  if (storedStatus !== "active" && storedStatus !== "trial") {
    return storedStatus === "expired" ? "expired" : "pending";
  }
  return expiresAt && expiresAt.getTime() > Date.now() ? storedStatus : "expired";
}

const invalidSessionCodes = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/invalid-session-cookie",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

export const getUserSession = cache(async (): Promise<UserSession | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    if (typeof decoded.uid !== "string") return null;
    const profile = await getFirebaseAdminFirestore().collection("users").doc(decoded.uid).get();
    const profileData = profile.data();
    const profileUsername = profileData?.username;
    const tradingAccess = profileData?.tradingAccess;
    const role = decoded.admin === true ? "admin" : "user";
    const storedStatus = tradingAccess?.status;
    const expiresAt = tradingAccess?.expiresAt instanceof Timestamp
      ? tradingAccess.expiresAt.toDate()
      : null;
    const status = resolveTradingAccessStatus(role, storedStatus, expiresAt);
    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : null,
      displayName: typeof decoded.name === "string" ? decoded.name : null,
      username: typeof profileUsername === "string"
        ? profileUsername
        : typeof decoded.email === "string" ? decoded.email.split("@")[0] : "user",
      role,
      tradingAccess: {
        status,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      invalidSessionCodes.has(error.code)
    ) {
      return null;
    }
    throw error;
  }
});

export function hasTradingAccess(session: UserSession): boolean {
  return session.role === "admin"
    || session.tradingAccess.status === "active"
    || session.tradingAccess.status === "trial";
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
