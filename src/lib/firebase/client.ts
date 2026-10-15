"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NODE_ENV === "development"
    ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
    : "iruangku.vercel.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfig = ["apiKey", "projectId", "appId"] as const;
for (const key of requiredConfig) {
  if (!firebaseConfig[key]) {
    throw new Error(`Firebase client configuration is missing NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}.`);
  }
}

const app = getApps().some((candidate) => candidate.name === "ruangku-client")
  ? getApp("ruangku-client")
  : initializeApp(firebaseConfig, "ruangku-client");

export const firebaseAuth = getAuth(app);
