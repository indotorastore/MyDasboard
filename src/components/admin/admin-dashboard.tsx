"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutDashboard, LogOut, Search, Settings2, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { AccountSettings } from "@/components/auth/account-settings";

export type AdminUser = {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  role: "admin" | "user";
  createdAt: string | null;
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
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Nama</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Username</th>
                        <th className="px-5 py-3">Peran</th>
                        <th className="px-5 py-3">Terdaftar</th>
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
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
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
