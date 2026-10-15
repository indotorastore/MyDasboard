"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
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
  const [showEmailForm, setShowEmailForm] = useState(false);

  async function handleGoogleSignUp() {
    setError("");
    setPending(true);
    let signedIn = false;
    try {
      await setPersistence(firebaseAuth, inMemoryPersistence);
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      signedIn = true;
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Pendaftaran dengan Google tidak dapat diselesaikan.");
      }
      await signOut(firebaseAuth);
      router.replace("/");
      router.refresh();
    } catch (cause) {
      if (signedIn && firebaseAuth.currentUser) {
        try {
          await signOut(firebaseAuth);
        } catch (signOutError) {
          console.error("Gagal membersihkan sesi Firebase client setelah pendaftaran Google gagal:", signOutError);
        }
      }
      const code = typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : "";
      setError(
        code === "auth/popup-closed-by-user"
          ? "Proses masuk Google dibatalkan."
          : code === "auth/popup-blocked"
            ? "Popup Google diblokir browser. Izinkan popup lalu coba kembali."
            : code === "auth/operation-not-allowed"
              ? "Login Google belum diaktifkan pada Firebase Authentication."
              : code === "auth/unauthorized-domain"
                ? "Domain aplikasi belum diizinkan pada pengaturan Firebase Authentication."
                : cause instanceof Error
                  ? cause.message
                  : "Pendaftaran dengan Google gagal. Periksa koneksi dan coba kembali.",
      );
    } finally {
      setPending(false);
    }
  }

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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-[#f6f7fb] to-white px-4 py-6">
      <section className="w-full max-w-lg rounded-[24px] border border-white/80 bg-white/95 p-6 shadow-2xl shadow-indigo-950/10 backdrop-blur sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <Image src="/ruangku-logo.png" alt="" width={40} height={40} unoptimized className="rounded-full" />
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900">ruangku</p>
            <p className="text-xs text-slate-400">ruang kerja personal</p>
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Buat akun Ruangku</h1>
        <p className="mt-1 text-sm text-slate-500">Mulai rapikan pekerjaan harian Anda.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm leading-relaxed text-rose-700">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={handleGoogleSignUp}
          className="mt-5 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.65 5.93c4.47-4.13 7.12-10.2 7.12-17.58Z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.55 2.56 10.78l7.97-6.19Z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.65-5.93c-2.13 1.43-4.86 2.28-8.25 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          {pending ? "Menghubungkan ke Google..." : "Daftar dengan Google"}
        </button>
        {showEmailForm && (
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            atau daftar dengan email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        )}
        {showEmailForm && <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            Nama lengkap
            <input
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Nama Anda"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
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
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="nama.pengguna"
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">3–24 karakter</span>
          </label>
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="nama@email.com"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            Sandi
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Minimal 12 karakter"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Konfirmasi sandi
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Ulangi sandi"
            />
          </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Membuat akun..." : "Buat akun"}
          </button>
        </form>}
        <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
          {!showEmailForm && (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Gunakan email dan sandi
            </button>
          )}
          {showEmailForm && "Sudah memiliki akun? "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Masuk</Link>
        </p>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
          Akun baru berperan sebagai pengguna. Hak admin diberikan oleh administrator.
        </p>
      </section>
    </main>
  );
}
