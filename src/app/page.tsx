"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  House,
  LayoutGrid,
  ListTodo,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForexDashboard } from "@/components/trading/forex-dashboard";

type Task = {
  id: number;
  title: string;
  time: string;
  done: boolean;
  priority: "Penting" | "Rutin";
};

const initialTasks: Task[] = [
  { id: 1, title: "Review proposal proyek Atlas", time: "09.30", done: false, priority: "Penting" },
  { id: 2, title: "Kirim update ke tim desain", time: "11.00", done: false, priority: "Rutin" },
  { id: 3, title: "Siapkan catatan meeting", time: "13.30", done: true, priority: "Rutin" },
];

const navigation: { label: string; icon: LucideIcon }[] = [
  { label: "Beranda", icon: House },
  { label: "Tugas", icon: ListTodo },
  { label: "Kalender", icon: CalendarDays },
  { label: "Catatan", icon: BookOpen },
  { label: "Keuangan", icon: Wallet },
  { label: "Trading", icon: ChartNoAxesCombined },
];

const shortcuts: {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
}[] = [
  { title: "Tugas", description: "Atur prioritas kerja", icon: ListTodo, color: "bg-indigo-50", iconColor: "text-indigo-600" },
  { title: "Kalender", description: "Jadwal & agenda", icon: CalendarDays, color: "bg-amber-50", iconColor: "text-amber-600" },
  { title: "Catatan", description: "Ide dan rangkuman", icon: FileText, color: "bg-emerald-50", iconColor: "text-emerald-600" },
  { title: "Proyek", description: "Pantau progres", icon: BriefcaseBusiness, color: "bg-rose-50", iconColor: "text-rose-600" },
];

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Beranda");
  const [notice, setNotice] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const completedTasks = tasks.filter((task) => task.done).length;
  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase())),
    [query, tasks],
  );

  function toggleTask(id: number) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function addTask() {
    setTasks((current) => [
      ...current,
      {
        id: Date.now(),
        title: "Tugas baru — klik untuk mengubah status",
        time: "15.00",
        done: false,
        priority: "Rutin",
      },
    ]);
    setNotice("Tugas baru ditambahkan");
    window.setTimeout(() => setNotice(""), 2500);
  }

  function selectNav(label: string) {
    setActiveNav(label);
    setMobileSidebarOpen(false);
    if (label !== "Beranda" && label !== "Trading") {
      setNotice(`${label} siap ditambahkan ke ruang kerja Anda`);
      window.setTimeout(() => setNotice(""), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      {mobileSidebarOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <aside className={`group/sidebar fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col overflow-hidden border-r border-slate-200/80 bg-white px-5 py-7 shadow-xl transition-[width,transform,padding] duration-200 lg:w-[68px] lg:px-3 lg:shadow-none lg:hover:w-[248px] lg:hover:px-5 lg:focus-within:w-[248px] lg:focus-within:px-5 ${
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <a href="#" className="mb-11 flex h-10 shrink-0 items-center gap-3 px-1" aria-label="Ruangku beranda">
          <Image src="/ruangku-logo.png" alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full object-contain" />
          <span className="overflow-hidden whitespace-nowrap opacity-100 transition-opacity lg:opacity-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:opacity-100">
            <span className="block text-[17px] font-bold tracking-tight">ruangku</span>
            <span className="block text-[11px] font-medium text-slate-400">ruang kerja personal</span>
          </span>
        </a>

        <p className="mb-3 h-4 overflow-hidden whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:opacity-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:opacity-100">Workspace</p>
        <nav className="space-y-1" aria-label="Navigasi utama">
          {navigation.map(({ label, icon: Icon }) => {
            const selected = activeNav === label;
            return (
              <button
                key={label}
                onClick={() => selectNav(label)}
                title={label}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${
                  selected
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="shrink-0" size={18} strokeWidth={selected ? 2.3 : 1.9} />
                <span className="overflow-hidden whitespace-nowrap opacity-100 transition-opacity lg:opacity-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:opacity-100">{label}</span>
                {label === "Tugas" && (
                  <span className="ml-auto rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 lg:opacity-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:opacity-100">
                    {tasks.filter((task) => !task.done).length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-5 hidden rounded-2xl bg-[#f7f7ff] p-4 lg:group-hover/sidebar:block lg:group-focus-within/sidebar:block">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
              <Sparkles size={16} />
            </div>
            <p className="text-[12px] font-bold">Ruang untuk berkembang</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Tambahkan menu yang cocok dengan cara kerjamu.
            </p>
            <button
              onClick={() => setNotice("Pengaturan menu akan tersedia di sini")}
              className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600"
            >
              Atur workspace <ArrowRight size={13} />
            </button>
          </div>
          <button
            onClick={() => setNotice("Pengaturan workspace siap disesuaikan")}
          title="Pengaturan"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-slate-500 hover:bg-slate-50"
          >
          <Settings2 className="shrink-0" size={18} />
          <span className="overflow-hidden whitespace-nowrap opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:opacity-100">Pengaturan</span>
          </button>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 px-1 pt-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f2d7c9] text-[12px] font-bold text-[#83543f]">RA</div>
          <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100 lg:group-focus-within/sidebar:opacity-100">
              <p className="truncate text-[12px] font-bold">Raka Aditya</p>
              <p className="text-[10px] text-slate-400">Personal workspace</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[68px]">
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-[#f6f7fb]/90 px-5 py-3 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between">
            <div className="flex items-center gap-2.5 lg:hidden">
              <button
                aria-label="Buka menu navigasi"
                aria-expanded={mobileSidebarOpen}
                onClick={() => setMobileSidebarOpen(true)}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"
              >
                <Menu size={18} />
              </button>
              <a href="#" className="flex items-center gap-2.5" aria-label="Ruangku beranda">
              <Image src="/ruangku-logo.png" alt="" width={36} height={36} unoptimized className="size-9 rounded-full object-contain" />
              <span className="text-[16px] font-bold tracking-tight">ruangku</span>
              </a>
            </div>
            <div className="hidden text-[12px] font-medium text-slate-400 lg:block">
              Workspace <span className="mx-2 text-slate-300">/</span>{" "}
              <span className="text-slate-700">{activeNav}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <label className="hidden h-10 w-[230px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 sm:flex">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari tugas..."
                  aria-label="Cari tugas"
                  className="w-full bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
                />
                <kbd className="rounded border border-slate-200 px-1 py-0.5 text-[9px] font-semibold">⌘ K</kbd>
              </label>
              <button
                aria-label="Notifikasi"
                onClick={() => setNotice("Kamu tidak punya notifikasi baru")}
                className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600"
              >
                <Bell size={17} />
                <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <div className="grid size-9 place-items-center rounded-full bg-[#f2d7c9] text-[11px] font-bold text-[#83543f] lg:hidden">RA</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1180px] px-5 pb-28 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pb-12 lg:pt-10">
          {activeNav === "Trading" ? <ForexDashboard /> : (
            <>
          <section className="mb-7 flex flex-col justify-between gap-5 sm:mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400">SELASA, 13 OKTOBER 2026</p>
              <h1 className="text-[26px] font-bold tracking-[-0.04em] text-slate-900 sm:text-[32px]">
                Selamat pagi, Raka <span className="text-indigo-500">✦</span>
              </h1>
              <p className="mt-1.5 text-[13px] text-slate-500 sm:text-[14px]">
                Satu langkah kecil hari ini membawa kamu lebih dekat ke tujuan.
              </p>
            </div>
            <Button
              onClick={addTask}
              className="h-11 w-full gap-2 rounded-xl bg-indigo-600 px-4 text-[12px] font-semibold text-white shadow-lg shadow-indigo-200/70 hover:bg-indigo-700 sm:w-auto"
            >
              <Plus size={16} strokeWidth={2.5} /> Tambah tugas
            </Button>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-[1.65fr_1fr]">
            <div className="relative min-h-[215px] overflow-hidden rounded-[22px] bg-[#202044] p-5 text-white shadow-xl shadow-indigo-950/10 sm:min-h-[230px] sm:p-7">
              <div className="absolute -right-16 -top-28 size-72 rounded-full border border-white/[0.06]" />
              <div className="absolute -right-2 -top-14 size-52 rounded-full border border-white/[0.07]" />
              <div className="absolute -bottom-28 right-24 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="relative z-[1] flex h-full flex-col justify-between gap-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-indigo-200/80">FOKUS HARI INI</p>
                    <h2 className="mt-2 text-[21px] font-bold tracking-tight sm:text-[24px]">Buat hari ini berarti.</h2>
                  </div>
                  <span className="hidden size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-indigo-200 sm:flex">
                    <Target size={21} />
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="w-full max-w-[290px]">
                    <div className="mb-2.5 flex items-center justify-between text-[11px]">
                      <span className="text-indigo-100/75">{completedTasks} dari {tasks.length} tugas selesai</span>
                      <span className="font-bold text-white">{tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[#b7f0d2] transition-all duration-500"
                        style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[10px] text-indigo-100/60">Konsisten lebih penting daripada sempurna.</p>
                  </div>
                  <div className="mb-0.5 hidden items-center gap-1.5 whitespace-nowrap text-[10px] font-medium text-indigo-100/70 sm:flex">
                    <ArrowDownRight size={14} className="text-emerald-300" /> Pelan tapi pasti
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-[170px] flex-col justify-between rounded-[22px] border border-slate-200/80 bg-white p-5 sm:min-h-[230px] sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">AGENDA BERIKUTNYA</p>
                  <p className="mt-3 text-[15px] font-bold text-slate-800">Diskusi progres proyek</p>
                  <p className="mt-1 text-[11px] text-slate-500">Sync bersama tim produk</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <CalendarDays size={18} />
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Clock3 size={14} className="text-slate-400" /> Hari ini, 14.00
                </span>
                <button
                  onClick={() => selectNav("Kalender")}
                  className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                  aria-label="Lihat kalender"
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>

          <section className="mb-7">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-[15px] font-bold tracking-tight">Akses cepat</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Semua yang kamu butuhkan, dalam satu tempat.</p>
              </div>
              <button
                onClick={() => setNotice("Menu baru dapat ditambahkan sesuai kebutuhanmu")}
                className="hidden items-center gap-1 text-[11px] font-semibold text-indigo-600 sm:flex"
              >
                Atur menu <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shortcuts.map(({ title, description, icon: Icon, color, iconColor }) => (
                <button
                  key={title}
                  onClick={() => selectNav(title)}
                  className="group rounded-[17px] border border-slate-200/80 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50 sm:p-4"
                >
                  <span className={`mb-3 grid size-9 place-items-center rounded-xl ${color} ${iconColor}`}>
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <span className="flex items-center justify-between">
                    <span className="text-[12px] font-bold">{title}</span>
                    <ArrowRight size={13} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                  </span>
                  <span className="mt-1 block text-[10px] text-slate-400">{description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight">Tugas hari ini</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">{tasks.filter((task) => !task.done).length} tugas menunggu perhatianmu</p>
                </div>
                <button
                  onClick={() => selectNav("Tugas")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
                >
                  Lihat semua <ChevronRight size={14} />
                </button>
              </div>
              <label className="mb-3 flex h-9 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 text-slate-400 sm:hidden">
                <Search size={14} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari tugas..."
                  aria-label="Cari tugas"
                  className="w-full bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
              <div className="divide-y divide-slate-100">
                {filteredTasks.length ? filteredTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.done ? `Tandai ${task.title} belum selesai` : `Tandai ${task.title} selesai`}
                      className={`grid size-[18px] shrink-0 place-items-center rounded-md border transition ${
                        task.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent hover:border-indigo-500"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[12px] font-semibold ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                        {task.title}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock3 size={11} /> {task.time}
                      </p>
                    </div>
                    <span className={`hidden rounded-md px-2 py-1 text-[9px] font-semibold sm:inline-flex ${
                      task.priority === "Penting" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                )) : (
                  <p className="py-6 text-center text-[12px] text-slate-400">Tidak ada tugas yang cocok dengan pencarian.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-white p-5">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold tracking-tight">Catatan kecil</h2>
                  <span className="grid size-8 place-items-center rounded-lg bg-[#f4f0ff] text-indigo-600">
                    <Sparkles size={15} />
                  </span>
                </div>
                <p className="text-[13px] font-semibold leading-relaxed text-slate-700">
                  &ldquo;Fokus pada progres, bukan kesempurnaan.&rdquo;
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  Sisihkan waktu untuk hal yang paling berdampak. Sisanya bisa menunggu.
                </p>
              </div>
              <button
                onClick={() => selectNav("Catatan")}
                className="mt-5 flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
              >
                Buka catatan <ArrowRight size={13} />
              </button>
            </div>
          </section>

          <footer className="mt-8 hidden items-center justify-between text-[10px] text-slate-400 lg:flex">
            <span>Ruang kerja yang tumbuh bersamamu.</span>
            <button onClick={() => setNotice("Pusat bantuan segera tersedia")} className="flex items-center gap-1 hover:text-indigo-600">
              <CircleHelp size={13} /> Bantuan
            </button>
          </footer>
            </>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigasi bawah">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {navigation.map(({ label, icon: Icon }) => {
            const selected = activeNav === label;
            return (
              <button
                key={label}
                onClick={() => selectNav(label)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-semibold transition ${
                  selected ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <span className={`grid size-7 place-items-center rounded-lg ${selected ? "bg-indigo-50" : ""}`}>
                  <Icon size={17} strokeWidth={selected ? 2.4 : 1.9} />
                </span>
                {label}
              </button>
            );
          })}
          <button
            onClick={() => setNotice("Menu tambahan dapat dikonfigurasi sesuai kebutuhanmu")}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-semibold text-slate-400"
          >
            <span className="grid size-7 place-items-center"><LayoutGrid size={17} /></span>
            Lainnya
          </button>
        </div>
      </nav>

      {notice && (
        <div role="status" className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-[12px] font-medium text-white shadow-xl lg:bottom-8">
          {notice}
        </div>
      )}
    </div>
  );
}
