import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getUserSession, hasSameOrigin } from "@/lib/auth/session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan masuk kembali." }, { status: 401 });
  }

  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    return NextResponse.json(
      { error: "Username harus 3–24 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung." },
      { status: 400 },
    );
  }

  try {
    const db = getFirebaseAdminFirestore();
    const profileRef = db.collection("users").doc(session.uid);
    const usernameRef = db.collection("usernames").doc(username);
    await db.runTransaction(async (transaction) => {
      const [profileSnapshot, usernameSnapshot, profileMatches] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(usernameRef),
        transaction.get(db.collection("users").where("username", "==", username).limit(1)),
      ]);
      if (usernameSnapshot.exists && usernameSnapshot.get("uid") !== session.uid) {
        throw new Error("USERNAME_TAKEN");
      }
      if (profileMatches.docs.some((profile) => profile.id !== session.uid)) {
        throw new Error("USERNAME_TAKEN");
      }

      const previousUsername = profileSnapshot.data()?.username;
      if (typeof previousUsername === "string" && previousUsername !== username) {
        const previousUsernameRef = db.collection("usernames").doc(previousUsername);
        const previousUsernameSnapshot = await transaction.get(previousUsernameRef);
        if (previousUsernameSnapshot.exists && previousUsernameSnapshot.get("uid") === session.uid) {
          transaction.delete(previousUsernameRef);
        }
      }

      transaction.set(usernameRef, { uid: session.uid });
      transaction.set(profileRef, { username, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "Username sudah digunakan. Pilih username lain." }, { status: 409 });
    }
    console.error("Firebase profile update failed:", error);
    return NextResponse.json({ error: "Profil tidak dapat diperbarui. Coba lagi nanti." }, { status: 500 });
  }
}
