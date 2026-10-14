"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut, updatePassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export function ChangePasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 12) {
      setError("Sandi baru harus terdiri dari minimal 12 karakter.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Konfirmasi sandi baru tidak cocok.");
      return;
    }

    setPending(true);
    let passwordChanged = false;
    try {
      await setPersistence(firebaseAuth, inMemoryPersistence);
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, currentPassword);
      await updatePassword(credential.user, newPassword);
      passwordChanged = true;
      await signOut(firebaseAuth);

      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Sandi berhasil diubah, tetapi sesi saat ini tidak dapat ditutup. Silakan masuk kembali.");
      }
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      if (firebaseAuth.currentUser) {
        try {
          await signOut(firebaseAuth);
        } catch (signOutError) {
          console.error("Gagal membersihkan sesi Firebase client setelah perubahan sandi:", signOutError);
        }
      }
      setError(
        passwordChanged
          ? cause instanceof Error ? cause.message : "Sandi berubah. Silakan masuk kembali."
          : "Sandi saat ini tidak cocok atau sandi baru ditolak. Periksa persyaratan sandi akun.",
      );
      if (passwordChanged) {
        router.replace("/login");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <label className="block text-sm font-semibold text-slate-700">
        Sandi saat ini
        <input
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Sandi baru
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Konfirmasi sandi baru
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Mengubah sandi..." : "Ubah sandi"}
      </button>
    </form>
  );
}
