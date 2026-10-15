"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { KeyRound, LayoutDashboard, LogOut, Search, Settings2, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import { AccountSettings } from "@/components/auth/account-settings";

export type AdminUser = {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  role: "admin" | "user";
  createdAt: string | null;
  tradingStatus: "pending" | "trial" | "active" | "expired";
  tradingExpiresAt: string | null;
};

type AdminSession = {
  email: string | null;
  displayName: string | null;
  username: string;
  role: "admin" | "user";
};

export function AdminDashboard({
  user,
  users,
  totalUsers,
  totalAdmins,
}: {
  user: AdminSession;
  users: AdminUser[];
  totalUsers: number;
  totalAdmins: number;
}) {
  const [activeSection, setActiveSection] = useState<"Ringkasan" | "Pengguna" | "Pengaturan">("Ringkasan");
  const [query, setQuery] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedApiUser, setSelectedApiUser] = useState<AdminUser | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiAccessStatus, setApiAccessStatus] = useState<AdminUser["tradingStatus"]>("pending");
  const [apiExpiresAt, setApiExpiresAt] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyRemoving, setApiKeyRemoving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyNotice, setApiKeyNotice] = useState("");
  const apiKeyRequestId = useRef(0);
  const [updatedAccessByUser, setUpdatedAccessByUser] = useState<
    Record<string, { status: AdminUser["tradingStatus"]; expiresAt: string | null }>
  >({});
  const displayName = user.displayName?.trim() || user.username;
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  const regularUsers = Math.max(0, totalUsers - totalAdmins);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((candidate) =>
      [candidate.displayName, candidate.email, candidate.username]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, users]);

  async function openApiKeySettings(candidate: AdminUser) {
    const requestId = ++apiKeyRequestId.current;
    setSelectedApiUser(candidate);
    setApiKey("");
    setApiKeyConfigured(false);
    setApiAccessStatus(candidate.tradingStatus);
    setApiExpiresAt(candidate.tradingExpiresAt);
    setApiKeyError("");
    setApiKeyNotice("");
    setApiKeyLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(candidate.uid)}/twelve-data-key`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({})) as {
        configured?: boolean;
        status?: AdminUser["tradingStatus"];
        expiresAt?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Status API key tidak dapat dimuat.");
      if (requestId !== apiKeyRequestId.current) return;
      setApiKeyConfigured(body.configured === true);
      const status = body.status ?? "pending";
      const expiresAt = body.expiresAt ?? null;
      setApiAccessStatus(status);
      setApiExpiresAt(expiresAt);
      setUpdatedAccessByUser((current) => ({
        ...current,
        [candidate.uid]: { status, expiresAt },
      }));
    } catch (error) {
      if (requestId === apiKeyRequestId.current) {
        setApiKeyError(error instanceof Error ? error.message : "Status API key tidak dapat dimuat.");
      }
    } finally {
      if (requestId === apiKeyRequestId.current) setApiKeyLoading(false);
    }
  }

  function closeApiKeySettings() {
    apiKeyRequestId.current += 1;
    setSelectedApiUser(null);
    setApiKey("");
    setApiKeyError("");
    setApiKeyNotice("");
  }

  async function saveApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApiUser) return;
    setApiKeyError("");
    setApiKeyNotice("");
    setApiKeySaving(true);
    try {
      const accessStatus = new FormData(event.currentTarget).get("accessStatus");
      const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedApiUser.uid)}/twelve-data-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, accessStatus }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        status?: AdminUser["tradingStatus"];
        expiresAt?: string | null;
      };
      if (!response.ok) throw new Error(body.error ?? "API key tidak dapat disimpan.");
      setApiKey("");
      setApiKeyConfigured(apiKeyConfigured || apiKey.trim().length > 0);
      const status = body.status ?? "pending";
      const expiresAt = body.expiresAt ?? null;
      setApiAccessStatus(status);
      setApiExpiresAt(expiresAt);
      setUpdatedAccessByUser((current) => ({
        ...current,
        [selectedApiUser.uid]: { status, expiresAt },
      }));
      setApiKeyNotice(
        status === "trial"
          ? "API key tersimpan. Masa trial 14 hari sudah dimulai."
          : status === "active"
            ? "API key tersimpan. Akses aktif selama 1 tahun."
            : "API key tersimpan. Akun tetap berstatus Pending.",
      );
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "API key tidak dapat disimpan.");
    } finally {
      setApiKeySaving(false);
    }
  }

  async function removeApiKey() {
    if (!selectedApiUser || !window.confirm(`Hapus API key Twelve Data untuk ${selectedApiUser.email || selectedApiUser.username}?`)) return;
    setApiKeyError("");
    setApiKeyNotice("");
    setApiKeyRemoving(true);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedApiUser.uid)}/twelve-data-key`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "API key tidak dapat dihapus.");
      setApiKeyConfigured(false);
      setApiAccessStatus("pending");
      setApiExpiresAt(null);
      setUpdatedAccessByUser((current) => ({
        ...current,
        [selectedApiUser.uid]: { status: "pending", expiresAt: null },
      }));
      setApiKeyNotice("API key dihapus dan akses Trading dikembalikan ke Pending.");
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "API key tidak dapat dihapus.");
    } finally {
      setApiKeyRemoving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Sesi tidak dapat ditutup. Coba lagi.");
      }
      window.location.assign("/login");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sesi tidak dapat ditutup. Coba lagi.");
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <Image src="/ruangku-logo.png" alt="" width={38} height={38} unoptimized className="rounded-full" />
          <span>
            <span className="block text-base font-bold">ruangku</span>
            <span className="block text-xs text-slate-400">Panel administrator</span>
          </span>
        </Link>
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Administrasi</p>
        <nav className="space-y-1" aria-label="Navigasi admin">
          {([
            ["Ringkasan", LayoutDashboard],
            ["Pengguna", Users],
            ["Pengaturan", Settings2],
          ] as const).map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveSection(label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                activeSection === label
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{displayName}</p>
            <p className="truncate text-[11px] text-slate-400">Administrator</p>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold">{activeSection}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 md:hidden">{initials}</div>
            <button
              type="button"
              disabled={loggingOut}
              onClick={logout}
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <LogOut size={15} /> {loggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </header>
        {logoutError && <p role="alert" className="bg-rose-50 px-5 py-2 text-center text-sm text-rose-700">{logoutError}</p>}

        <div className="border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <nav className="flex gap-2" aria-label="Navigasi admin">
            {(["Ringkasan", "Pengguna", "Pengaturan"] as const).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveSection(label)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  activeSection === label ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <section className="mx-auto max-w-6xl p-4 sm:p-8">
          {activeSection === "Pengaturan" ? (
            <AccountSettings
              email={user.email ?? ""}
              displayName={displayName}
              username={user.username}
              role={user.role}
            />
          ) : (
            <>
              <div className="mb-7">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">Administrasi Ruangku</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {activeSection === "Ringkasan" ? "Ringkasan admin" : "Data pengguna"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {activeSection === "Ringkasan"
                    ? "Pantau akun yang terdaftar di Ruangku."
                    : "Lihat akun dan informasi profil pengguna."}
                </p>
              </div>

              <div className="mb-7 grid gap-4 sm:grid-cols-3">
                <SummaryCard label="Total akun" value={totalUsers} icon={Users} />
                <SummaryCard label="Pengguna" value={regularUsers} icon={Users} />
                <SummaryCard label="Administrator" value={totalAdmins} icon={ShieldCheck} />
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h2 className="font-bold">{activeSection === "Ringkasan" ? "Pengguna terbaru" : "Semua pengguna"}</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Menampilkan {users.length} dari {totalUsers} akun terbaru
                    </p>
                  </div>
                  <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 sm:w-64">
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari nama, email, username"
                      aria-label="Cari pengguna"
                      className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Nama</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Username</th>
                        <th className="px-5 py-3">Peran</th>
                        <th className="px-5 py-3">Terdaftar</th>
                        <th className="px-5 py-3">Akses Trading</th>
                        <th className="px-5 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((candidate) => (
                        <tr key={candidate.uid} className="text-slate-600">
                          <td className="px-5 py-3.5 font-semibold text-slate-800">
                            {candidate.displayName || "Belum mengisi"}
                          </td>
                          <td className="px-5 py-3.5">{candidate.email || "—"}</td>
                          <td className="px-5 py-3.5">{candidate.username || "—"}</td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              candidate.role === "admin" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {candidate.role === "admin" ? "Admin" : "Pengguna"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {candidate.createdAt
                              ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(candidate.createdAt))
                              : "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            {(() => {
                              const access = updatedAccessByUser[candidate.uid] ?? {
                                status: candidate.tradingStatus,
                                expiresAt: candidate.tradingExpiresAt,
                              };
                              const statusStyles = {
                                pending: "bg-amber-50 text-amber-700",
                                trial: "bg-sky-50 text-sky-700",
                                active: "bg-emerald-50 text-emerald-700",
                                expired: "bg-rose-50 text-rose-700",
                              } as const;
                              const statusLabels = {
                                pending: "Pending",
                                trial: "Trial",
                                active: "Aktif",
                                expired: "Kedaluwarsa",
                              } as const;
                              return (
                                <>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[access.status]}`}>
                                    {statusLabels[access.status]}
                                  </span>
                                  {access.expiresAt && access.status !== "pending" && (
                                    <span className="mt-1 block text-[10px] text-slate-400">
                                      s.d. {new Intl.DateTimeFormat("id-ID", {
                                        dateStyle: "medium",
                                        timeZone: "Asia/Jakarta",
                                      }).format(new Date(access.expiresAt))}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() => void openApiKeySettings(candidate)}
                              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-200 px-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                            >
                              <KeyRound size={13} />
                              Atur API
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                            {query ? "Tidak ada pengguna yang cocok." : "Belum ada pengguna."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </section>
      </div>
      {selectedApiUser && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="twelve-data-settings-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Integrasi per akun</p>
                <h2 id="twelve-data-settings-title" className="mt-1 text-lg font-bold text-slate-900">API Twelve Data</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedApiUser.displayName || selectedApiUser.email || selectedApiUser.username}
                </p>
              </div>
              <button
                type="button"
                disabled={apiKeySaving || apiKeyRemoving}
                onClick={closeApiKeySettings}
                aria-label="Tutup pengaturan API"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              Masukkan key khusus untuk akun ini. Key disimpan di server dan tidak ditampilkan kembali. Trial berlaku 14 hari; Aktif berlaku 1 tahun sejak disimpan.
            </p>
            {apiKeyLoading ? (
              <p className="mt-4 text-sm text-slate-500">Memeriksa konfigurasi API...</p>
            ) : (
              <>
                <p className="mt-4 text-xs font-semibold text-slate-600">
                  Status:{" "}
                  <span className={
                    apiAccessStatus === "active" ? "text-emerald-700"
                      : apiAccessStatus === "trial" ? "text-sky-700"
                        : apiAccessStatus === "expired" ? "text-rose-700"
                          : "text-amber-700"
                  }>
                    {apiAccessStatus === "active" ? "Aktif"
                      : apiAccessStatus === "trial" ? "Trial"
                        : apiAccessStatus === "expired" ? "Kedaluwarsa"
                          : "Pending"}
                  </span>
                  {" · "}
                  <span className={apiKeyConfigured ? "text-emerald-700" : "text-slate-500"}>
                    {apiKeyConfigured ? "API key tersimpan" : "API key belum diisi"}
                  </span>
                </p>
                {apiExpiresAt && apiAccessStatus !== "pending" && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Akses berakhir {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Jakarta",
                    }).format(new Date(apiExpiresAt))}
                  </p>
                )}
                <form onSubmit={saveApiKey} className="mt-4 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    {apiKeyConfigured ? "Ganti API key (kosongkan untuk memakai key tersimpan)" : "API key Twelve Data"}
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={256}
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Masukkan API key"
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="submit"
                      name="accessStatus"
                      value="trial"
                      disabled={apiKeySaving || apiKeyRemoving || (!apiKeyConfigured && !apiKey.trim())}
                      className="h-10 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {apiKeySaving ? "Menyimpan..." : "Mulai Trial 14 hari"}
                    </button>
                    <button
                      type="submit"
                      name="accessStatus"
                      value="active"
                      disabled={apiKeySaving || apiKeyRemoving || (!apiKeyConfigured && !apiKey.trim())}
                      className="h-10 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {apiKeySaving ? "Menyimpan..." : "Aktif 1 tahun"}
                    </button>
                    <button
                      type="submit"
                      name="accessStatus"
                      value="pending"
                      disabled={apiKeySaving || apiKeyRemoving}
                      className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
                    >
                      {apiKeySaving ? "Menyimpan..." : "Simpan key, tetap Pending"}
                    </button>
                  </div>
                </form>
                {apiKeyConfigured && (
                  <button
                    type="button"
                    disabled={apiKeySaving || apiKeyRemoving}
                    onClick={() => void removeApiKey()}
                    className="mt-2 h-10 w-full rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {apiKeyRemoving ? "Menghapus..." : "Hapus key & tangguhkan akses"}
                  </button>
                )}
              </>
            )}
            {apiKeyError && <p role="alert" className="mt-3 text-xs text-rose-700">{apiKeyError}</p>}
            {apiKeyNotice && <p role="status" className="mt-3 text-xs text-emerald-700">{apiKeyNotice}</p>}
          </section>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon size={18} />
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value.toLocaleString("id-ID")}</p>
    </article>
  );
}
