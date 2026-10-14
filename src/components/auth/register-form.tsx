"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  setPersistence,
  signOut,
  updateProfile,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
      setError("Username harus 3–24 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.");
      return;
    }
    if (password.length < 12) {
      setError("Sandi harus terdiri dari minimal 12 karakter.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi sandi tidak cocok.");
      return;
    }

    setPending(true);
    let signedIn = false;
    try {
      await setPersistence(firebaseAuth, inMemoryPersistence);
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      signedIn = true;
      await updateProfile(credential.user, { displayName: displayName.trim() });
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, username: normalizedUsername }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Pendaftaran tidak dapat diselesaikan.");
      }
      await signOut(firebaseAuth);
      router.replace("/");
      router.refresh();
    } catch (cause) {
      if (signedIn && firebaseAuth.currentUser) {
        try {
          await signOut(firebaseAuth);
        } catch (signOutError) {
          console.error("Gagal membersihkan sesi Firebase client setelah pendaftaran gagal:", signOutError);
        }
      }
      const message = cause instanceof Error ? cause.message : "";
      setError(
        message.includes("email-already-in-use")
          ? "Email ini sudah memiliki akun. Silakan masuk."
          : message.includes("weak-password")
            ? "Sandi tidak memenuhi kebijakan Firebase. Gunakan sandi yang lebih kuat."
            : message || "Pendaftaran gagal. Periksa data Anda dan coba kembali.",
      );
    } finally {
      setPending(false);
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
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Mulai dari sini</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat akun Ruangku</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Ruang personal untuk membantu pekerjaan harian terasa lebih teratur.
        </p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Nama lengkap
            <input
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Nama Anda"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Username
            <input
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9._-]+"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="nama.pengguna"
            />
            <span className="mt-1.5 block text-xs font-normal text-slate-400">3–24 karakter: huruf, angka, titik, _ atau -</span>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="nama@email.com"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Sandi
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Minimal 12 karakter"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Konfirmasi sandi
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Ulangi sandi"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Membuat akun..." : "Buat akun"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Sudah memiliki akun?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Masuk</Link>
        </p>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
          Akun baru memiliki peran pengguna. Hak admin hanya dapat diberikan oleh administrator.
        </p>
      </section>
    </main>
  );
}
