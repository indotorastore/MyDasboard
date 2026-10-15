"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  getRedirectResult,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [showGoogleRedirect, setShowGoogleRedirect] = useState(false);
  const redirectResultHandled = useRef(false);

  useEffect(() => {
    void getRedirectResult(firebaseAuth)
      .then(async (credential) => {
        if (!credential || redirectResultHandled.current) return;
        redirectResultHandled.current = true;
        setPending(true);

        let signedIn = true;
        try {
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
          signedIn = false;
          router.replace("/");
          router.refresh();
        } catch (cause) {
          if (signedIn && firebaseAuth.currentUser) {
            try {
              await signOut(firebaseAuth);
            } catch (signOutError) {
              console.error("Gagal membersihkan sesi Firebase client setelah login Google gagal:", signOutError);
            }
          }
          setError(cause instanceof Error ? cause.message : "Login dengan Google gagal. Coba kembali.");
        } finally {
          setPending(false);
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Hasil login Google tidak dapat diverifikasi.");
      });
  }, [router]);

  async function handleGoogleLogin() {
    setError("");
    setNotice("");
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
        throw new Error(body.error ?? "Akun ini belum diizinkan masuk ke Ruangku.");
      }
      await signOut(firebaseAuth);
      router.replace("/");
      router.refresh();
    } catch (cause) {
      if (signedIn && firebaseAuth.currentUser) {
        try {
          await signOut(firebaseAuth);
        } catch (signOutError) {
          console.error("Gagal membersihkan sesi Firebase client setelah login Google gagal:", signOutError);
        }
      }
      const code = typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : "";
      setError(
        code === "auth/popup-closed-by-user"
            ? "Jendela Google tertutup sebelum proses masuk selesai."
          : code === "auth/popup-blocked"
            ? "Popup Google diblokir browser. Izinkan popup atau lanjutkan tanpa popup."
            : code === "auth/operation-not-allowed"
              ? "Login Google belum diaktifkan pada Firebase Authentication."
              : code === "auth/unauthorized-domain"
                ? "Domain aplikasi belum diizinkan pada pengaturan Firebase Authentication."
                : cause instanceof Error
                  ? cause.message
                  : "Login dengan Google gagal. Periksa koneksi dan coba kembali.",
      );
      setShowGoogleRedirect(code === "auth/popup-closed-by-user" || code === "auth/popup-blocked");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleRedirect() {
    setError("");
    setShowGoogleRedirect(false);
    setPending(true);
    try {
      await setPersistence(firebaseAuth, browserSessionPersistence);
      await signInWithRedirect(firebaseAuth, new GoogleAuthProvider());
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : "";
      setError(
        code === "auth/operation-not-allowed"
          ? "Login Google belum diaktifkan pada Firebase Authentication."
          : code === "auth/unauthorized-domain"
            ? "Domain aplikasi belum diizinkan pada pengaturan Firebase Authentication."
            : cause instanceof Error
              ? cause.message
              : "Login dengan Google gagal. Periksa koneksi dan coba kembali.",
      );
      setPending(false);
    }
  }

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
          Masuk menggunakan akun Google atau email dan sandi.
        </p>
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {showGoogleRedirect && (
          <button
            type="button"
            disabled={pending}
            onClick={handleGoogleRedirect}
            className="mt-3 w-full rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
          >
            Coba masuk Google tanpa popup
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleGoogleLogin}
          className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.65 5.93c4.47-4.13 7.12-10.2 7.12-17.58Z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.55 2.56 10.78l7.97-6.19Z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.65-5.93c-2.13 1.43-4.86 2.28-8.25 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          {pending ? "Menghubungkan ke Google..." : "Masuk dengan Google"}
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          atau masuk dengan email
          <span className="h-px flex-1 bg-slate-200" />
        </div>
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
