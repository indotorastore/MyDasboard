"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inMemoryPersistence, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);

    let signedIn = false;
    try {
      await setPersistence(firebaseAuth, inMemoryPersistence);
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      signedIn = true;
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Akun ini belum diizinkan masuk ke Ruangku.");
      }
      await signOut(firebaseAuth);
      router.replace("/");
      router.refresh();
    } catch (cause) {
      if (signedIn) {
        try {
          await signOut(firebaseAuth);
        } catch (signOutError) {
          console.error("Gagal membersihkan sesi Firebase client setelah login gagal:", signOutError);
        }
      }
      setError(
        signedIn && cause instanceof Error
          ? cause.message
          : "Email atau sandi tidak cocok. Periksa kembali informasi masuk Anda.",
      );
    } finally {
      setPending(false);
    }
  }

  async function sendResetEmail() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Masukkan email terlebih dahulu untuk meminta tautan reset sandi.");
      return;
    }

    setResetPending(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setNotice("Jika email tersebut terdaftar, Firebase akan mengirim tautan untuk mengatur ulang sandi.");
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : "";
      if (code === "auth/user-not-found") {
        setNotice("Jika email tersebut terdaftar, Firebase akan mengirim tautan untuk mengatur ulang sandi.");
      } else if (code === "auth/invalid-email") {
        setError("Format email tidak valid.");
      } else {
        setError("Permintaan reset sandi gagal. Periksa koneksi dan coba kembali.");
      }
    } finally {
      setResetPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-[#f6f7fb] to-white px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-7 shadow-2xl shadow-indigo-950/10 backdrop-blur sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/ruangku-logo.png" alt="" width={48} height={48} unoptimized className="rounded-full" />
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">ruangku</p>
            <p className="text-xs text-slate-400">ruang kerja personal</p>
          </div>
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Selamat datang kembali</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Masuk ke workspace</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Masuk menggunakan email dan sandi akun Ruangku Anda.
        </p>
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="nama@email.com"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            <span className="flex items-center justify-between">
              Sandi
              <button
                type="button"
                disabled={resetPending}
                onClick={sendResetEmail}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
              >
                {resetPending ? "Mengirim tautan..." : "Lupa sandi?"}
              </button>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Masukkan sandi"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Belum memiliki akun?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">Daftar</Link>
        </p>
      </section>
    </main>
  );
}
