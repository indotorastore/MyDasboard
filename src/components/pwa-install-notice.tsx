"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_UNTIL_KEY = "ruangku-install-notice-dismissed-until";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaInstallNotice() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    let installed = isAppInstalled();
    let dismissed = false;

    try {
      dismissed = Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY)) > Date.now();
    } catch (error) {
      console.error("Status notifikasi instalasi tidak dapat dibaca:", error);
    }

    function showAfterDelay() {
      if (installed || dismissed || timer !== undefined) return;
      timer = window.setTimeout(() => setVisible(true), 15_000);
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      showAfterDelay();
    }

    function handleInstalled() {
      installed = true;
      setVisible(false);
      setInstallPrompt(null);
    }

    if (isIosDevice()) showAfterDelay();
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch (error) {
      console.error("Status penutupan notifikasi instalasi tidak dapat disimpan:", error);
    }
  }

  async function installApp() {
    if (!installPrompt) {
      setIosInstructions((current) => !current);
      return;
    }

    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      setVisible(false);
    } catch (error) {
      console.error("Gagal memulai pemasangan Ruangku:", error);
      setVisible(false);
    } finally {
      setInstalling(false);
    }
  }

  if (!visible || (!installPrompt && !isIosDevice())) return null;

  return (
    <aside
      role="region"
      aria-label="Instal aplikasi Ruangku"
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup notifikasi instalasi"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={16} />
      </button>
      <div className="flex items-center gap-3 pr-7">
        <Image src="/ruangku-logo.png" alt="" width={40} height={40} unoptimized className="rounded-full" />
        <div>
          <p className="text-sm font-bold text-slate-900">Pasang Ruangku</p>
          <p className="mt-0.5 text-xs text-slate-500">Akses lebih cepat dari layar utama.</p>
        </div>
      </div>
      {iosInstructions && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          Di Safari, ketuk <strong>Bagikan</strong>, lalu pilih <strong>Tambah ke Layar Utama</strong>.
        </p>
      )}
      <button
        type="button"
        disabled={installing}
        onClick={installApp}
        className="mt-3 h-10 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {installing ? "Membuka pemasangan..." : installPrompt ? "Instal aplikasi" : "Cara memasang"}
      </button>
    </aside>
  );
}
