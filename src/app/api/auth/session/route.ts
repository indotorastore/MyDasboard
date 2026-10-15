import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { hasSameOrigin, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  }

  let body: { idToken?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
  }

  if (typeof body.idToken !== "string" || body.idToken.length > 12_000) {
    return NextResponse.json({ error: "Token autentikasi tidak valid." }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(body.idToken, true);
    const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time * 1000 : 0;
    if (Date.now() - authTime > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Login sudah kedaluwarsa. Silakan masuk kembali." }, { status: 401 });
    }

    const user = await auth.getUser(decoded.uid);
    const role = decoded.admin === true ? "admin" : "user";
    const submittedUsername = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const emailPrefix = user.email?.split("@")[0]?.toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 15);
    const uidSuffix = createHash("sha256").update(user.uid).digest("hex").slice(0, 8);
    const fallbackUsername = role === "admin"
      ? (typeof decoded.username === "string" ? decoded.username : "admin")
      : `${emailPrefix || "user"}-${uidSuffix}`;

    const db = getFirebaseAdminFirestore();
    const profileRef = db.collection("users").doc(user.uid);
    await db.runTransaction(async (transaction) => {
      const existingProfile = await transaction.get(profileRef);
      const existingUsername = existingProfile.data()?.username;
      const username = role === "admin"
        ? fallbackUsername
        : submittedUsername || (typeof existingUsername === "string" ? existingUsername : fallbackUsername);
      if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
        throw new Error("INVALID_USERNAME");
      }

      const usernameRef = db.collection("usernames").doc(username);
      const [usernameSnapshot, profileMatches] = await Promise.all([
        transaction.get(usernameRef),
        transaction.get(db.collection("users").where("username", "==", username).limit(1)),
      ]);
      if (usernameSnapshot.exists && usernameSnapshot.get("uid") !== user.uid) {
        throw new Error("USERNAME_TAKEN");
      }
      if (profileMatches.docs.some((profile) => profile.id !== user.uid)) {
        throw new Error("USERNAME_TAKEN");
      }
      const currentUsername = existingUsername;
      if (typeof currentUsername === "string" && currentUsername !== username) {
        const oldUsernameRef = db.collection("usernames").doc(currentUsername);
        const oldUsername = await transaction.get(oldUsernameRef);
        if (oldUsername.exists && oldUsername.get("uid") === user.uid) {
          transaction.delete(oldUsernameRef);
        }
      }
      transaction.set(usernameRef, { uid: user.uid });
      transaction.set(profileRef, {
        username,
        role,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        ...(existingProfile.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const sessionCookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "Username sudah digunakan. Pilih username lain." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_USERNAME") {
      return NextResponse.json(
        { error: "Username harus 3–24 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung." },
        { status: 400 },
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("auth/")
    ) {
      return NextResponse.json({ error: "Login tidak valid atau sudah kedaluwarsa." }, { status: 401 });
    }
    console.error("Firebase session creation failed:", error);
    return NextResponse.json({ error: "Sesi aman tidak dapat dibuat. Coba lagi nanti." }, { status: 500 });
  }
}
