"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function subscribeToIosDevice(callback: () => void) {
  window.addEventListener("pageshow", callback);
  return () => window.removeEventListener("pageshow", callback);
}

function getIsIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function subscribeToInstalledState(callback: () => void) {
  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  standaloneQuery.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    standaloneQuery.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

function getIsInstalled() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const isIos = useSyncExternalStore(subscribeToIosDevice, getIsIosDevice, () => false);
  const isInstalled = useSyncExternalStore(subscribeToInstalledState, getIsInstalled, () => false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => console.error("Gagal mendaftarkan service worker PWA:", error));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setShowIosInstructions((current) => !current);
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch (error) {
      console.error("Gagal memasang aplikasi Ruangku:", error);
      setInstallPrompt(null);
    }
  }

  if (isInstalled || (!installPrompt && !isIos)) return null;

  return (
    <div className="fixed bottom-24 right-4 z-30 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 lg:bottom-5">
      {showIosInstructions && isIos && (
        <p className="max-w-64 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600 shadow-lg">
          Ketuk tombol Bagikan di Safari, lalu pilih <strong>Tambah ke Layar Utama</strong>.
        </p>
      )}
      <button
        type="button"
        onClick={installApp}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Image src="/ruangku-logo.png" alt="" width={24} height={24} unoptimized className="rounded-full bg-white" />
        {installPrompt ? "Pasang Ruangku" : "Cara memasang"}
      </button>
    </div>
  );
}
