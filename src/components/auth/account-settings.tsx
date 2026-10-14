"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export function AccountSettings({ email, displayName, username, role }: { email: string; displayName: string; username: string; role: "admin" | "user" }) {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sesi tidak dapat ditutup. Coba lagi.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sesi tidak dapat ditutup. Coba lagi.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400">AKUN</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="mt-2 text-sm text-slate-500">Kelola informasi dan keamanan akun Ruangku.</p>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-base font-bold text-slate-900">Profil admin</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-400">Nama</dt>
            <dd className="mt-1 font-semibold text-slate-700">{displayName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Email</dt>
            <dd className="mt-1 font-semibold text-slate-700">{email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Peran</dt>
            <dd className="mt-1 font-semibold capitalize text-slate-700">{role}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Username</dt>
            <dd className="mt-1 font-semibold text-slate-700">{username}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-base font-bold text-slate-900">Ubah sandi</h2>
        <p className="mb-5 mt-1 text-sm leading-relaxed text-slate-500">
          Masukkan sandi saat ini dan pilih sandi baru minimal 12 karakter. Setelah diubah, Anda akan diminta masuk kembali.
        </p>
        <ChangePasswordForm email={email} />
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-base font-bold text-slate-900">Sesi</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">Keluar dari Ruangku di perangkat ini.</p>
        {logoutError && <p role="alert" className="mb-3 text-sm text-rose-700">{logoutError}</p>}
        <button
          type="button"
          disabled={loggingOut}
          onClick={logout}
          className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </section>
    </div>
  );
}
