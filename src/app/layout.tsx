import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ruangku — Ruang Kerja Personal",
  description: "Satu ruang personal untuk mengatur tugas, agenda, catatan, dan pekerjaanmu.",
  applicationName: "Ruangku",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ruangku",
  },
  icons: {
    icon: "/ruangku-logo.png",
    apple: "/ruangku-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
