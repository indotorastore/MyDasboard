import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const appName = "ruangku-admin";

function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    !projectId ||
    !clientEmail ||
    !privateKey ||
    projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  ) {
    throw new Error("Firebase Admin credentials are missing or do not match the configured Firebase project.");
  }

  return getApps().find((app) => app.name === appName) ?? initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }), projectId },
    appName,
  );
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp());
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getAdminApp());
}
