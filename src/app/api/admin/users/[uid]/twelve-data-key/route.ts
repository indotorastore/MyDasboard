import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getUserSession, hasSameOrigin, resolveTradingAccessStatus } from "@/lib/auth/session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

const TRIAL_DURATION_DAYS = 14;
const ACTIVE_DURATION_DAYS = 365;

type RouteContext = {
  params: Promise<{ uid: string }>;
};

async function getAdminAndProfile(uid: string) {
  const session = await getUserSession();
  if (!session) {
    return { response: NextResponse.json({ error: "Sesi tidak valid. Silakan masuk kembali." }, { status: 401 }) };
  }
  if (session.role !== "admin") {
    return { response: NextResponse.json({ error: "Akses administrator diperlukan." }, { status: 403 }) };
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    return { response: NextResponse.json({ error: "ID pengguna tidak valid." }, { status: 400 }) };
  }

  try {
    const profileRef = getFirebaseAdminFirestore().collection("users").doc(uid);
    const profile = await profileRef.get();
    if (!profile.exists) {
      return { response: NextResponse.json({ error: "Akun pengguna tidak ditemukan." }, { status: 404 }) };
    }
    return { profileRef, profile };
  } catch (error) {
    console.error("Twelve Data API key profile lookup failed:", error);
    return { response: NextResponse.json({ error: "Data akun tidak dapat dimuat. Coba lagi nanti." }, { status: 500 }) };
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { uid } = await context.params;
  const result = await getAdminAndProfile(uid);
  if ("response" in result) return result.response;

  const profileData = result.profile.data();
  const integrations = profileData?.integrations;
  const access = profileData?.tradingAccess;
  const configured = typeof integrations?.twelveDataApiKey === "string"
    && integrations.twelveDataApiKey.length > 0;
  const expiration = access?.expiresAt instanceof Timestamp ? access.expiresAt.toDate() : null;
  const status = resolveTradingAccessStatus(
    profileData?.role === "admin" ? "admin" : "user",
    access?.status,
    expiration,
  );
  return NextResponse.json({
    configured,
    status,
    expiresAt: expiration?.toISOString() ?? null,
  });
}

export async function POST(request: Request, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  }

  const { uid } = await context.params;
  const result = await getAdminAndProfile(uid);
  if ("response" in result) return result.response;

  let body: { apiKey?: unknown; accessStatus?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
  }

  const accessStatus = body.accessStatus;
  if (accessStatus !== "pending" && accessStatus !== "trial" && accessStatus !== "active") {
    return NextResponse.json({ error: "Pilih status Pending, Trial, atau Aktif." }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey && (apiKey.length < 8 || apiKey.length > 256 || /\s/.test(apiKey))) {
    return NextResponse.json({ error: "API key harus 8–256 karakter tanpa spasi." }, { status: 400 });
  }

  const durationDays = accessStatus === "trial" ? TRIAL_DURATION_DAYS : ACTIVE_DURATION_DAYS;
  const expiresAt = accessStatus === "pending"
    ? null
    : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  try {
    await getFirebaseAdminFirestore().runTransaction(async (transaction) => {
      const profile = await transaction.get(result.profileRef);
      const integrations = profile.data()?.integrations;
      const currentApiKey = typeof integrations?.twelveDataApiKey === "string"
        ? integrations.twelveDataApiKey.trim()
        : "";
      if (accessStatus !== "pending" && !apiKey && !currentApiKey) {
        throw new Error("TWELVE_DATA_KEY_REQUIRED");
      }

      const updates: Record<string, unknown> = {
        "tradingAccess.status": accessStatus,
        "tradingAccess.expiresAt": expiresAt ? Timestamp.fromDate(expiresAt) : null,
        "tradingAccess.activatedAt": accessStatus === "pending" ? FieldValue.delete() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (apiKey) updates["integrations.twelveDataApiKey"] = apiKey;
      transaction.update(result.profileRef, updates);
    });
    return NextResponse.json({
      success: true,
      status: accessStatus,
      expiresAt: expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TWELVE_DATA_KEY_REQUIRED") {
      return NextResponse.json({ error: "Masukkan API key Twelve Data sebelum mengaktifkan akun." }, { status: 400 });
    }
    console.error("Twelve Data API key update failed:", error);
    return NextResponse.json({ error: "Pengaturan akses Trading tidak dapat disimpan. Coba lagi nanti." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  }

  const { uid } = await context.params;
  const result = await getAdminAndProfile(uid);
  if ("response" in result) return result.response;

  try {
    await result.profileRef.update({
      "integrations.twelveDataApiKey": FieldValue.delete(),
      "tradingAccess.status": "pending",
      "tradingAccess.expiresAt": null,
      "tradingAccess.activatedAt": FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, status: "pending", expiresAt: null });
  } catch (error) {
    console.error("Twelve Data API key removal failed:", error);
    return NextResponse.json({ error: "API key tidak dapat dihapus. Coba lagi nanti." }, { status: 500 });
  }
}
