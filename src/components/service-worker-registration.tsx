"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        console.error("Gagal memperbarui service worker Ruangku:", error);
      });
  }, []);

  return null;
}
