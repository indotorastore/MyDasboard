import { NextResponse } from "next/server";
import { getUserSession, hasTradingAccess } from "@/lib/auth/session";

export const maxDuration = 30;

type GeminiAnnotation = {
  type?: string;
  url?: string;
  title?: string;
};

type GeminiResponse = {
  status?: string;
  error?: string | { message?: string; status?: string; code?: number };
  message?: string;
  code?: number;
  steps?: {
    type?: string;
    content?: {
      type?: string;
      text?: string;
      annotations?: GeminiAnnotation[];
    }[];
  }[];
};

function getProviderError(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;

  const response = payload as Record<string, unknown>;
  const error = response.error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  for (const field of ["message", "detail", "error_description"]) {
    if (typeof response[field] === "string") return response[field] as string;
  }
  return undefined;
}

const requestWindows = new Map<string, { startedAt: number; count: number }>();

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Silakan masuk untuk mengakses analisa ini." }, { status: 401 });
  }
  if (!hasTradingAccess(session)) {
    return NextResponse.json(
      { error: session.tradingAccess.status === "expired"
        ? "Masa akses Trading telah berakhir. Hubungi administrator untuk mengaktifkannya kembali."
        : "Akses Trading Anda masih menunggu persetujuan administrator." },
      { status: 403 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();

  if (!apiKey || !model) {
    return NextResponse.json(
      { error: "Analisa AI belum dikonfigurasi. Periksa GEMINI_API_KEY dan GEMINI_MODEL di environment server." },
      { status: 503 },
    );
  }
  if (!/^[A-Za-z0-9._-]+$/.test(model)) {
    return NextResponse.json({ error: "GEMINI_MODEL berisi nama model yang tidak valid." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Header asal permintaan tidak valid." }, { status: 400 });
    }
  }

  const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const requestWindow = requestWindows.get(clientAddress);
  if (requestWindow && now - requestWindow.startedAt < 10 * 60_000 && requestWindow.count >= 5) {
    return NextResponse.json(
      { error: "Batas sementara analisa AI tercapai. Coba kembali dalam beberapa menit." },
      { status: 429 },
    );
  }
  if (!requestWindow || now - requestWindow.startedAt >= 10 * 60_000) {
    requestWindows.set(clientAddress, { startedAt: now, count: 1 });
  } else {
    requestWindow.count += 1;
  }
  if (requestWindows.size > 5000) {
    for (const [address, window] of requestWindows) {
      if (now - window.startedAt >= 10 * 60_000) requestWindows.delete(address);
    }
  }

  let body: { pair?: unknown; interval?: unknown; technical?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
  }

  const pair = typeof body.pair === "string" ? body.pair.toUpperCase() : "";
  const interval = typeof body.interval === "string" ? body.interval : "";
  if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(pair)) {
    return NextResponse.json({ error: "Pair Forex tidak valid." }, { status: 400 });
  }
  if (!["15min", "1h", "4h", "1day"].includes(interval)) {
    return NextResponse.json({ error: "Timeframe tidak didukung." }, { status: 400 });
  }
  if (typeof body.technical !== "object" || body.technical === null || Array.isArray(body.technical)) {
    return NextResponse.json({ error: "Ringkasan teknikal tidak valid." }, { status: 400 });
  }

  const technical = body.technical as Record<string, unknown>;
  const price = typeof technical.price === "number" && Number.isFinite(technical.price) ? technical.price : null;
  const ema20 = typeof technical.ema20 === "number" && Number.isFinite(technical.ema20) ? technical.ema20 : null;
  const ema50 = typeof technical.ema50 === "number" && Number.isFinite(technical.ema50) ? technical.ema50 : null;
  const rsi = typeof technical.rsi === "number" && Number.isFinite(technical.rsi) ? technical.rsi : null;
  const atr = typeof technical.atr === "number" && Number.isFinite(technical.atr) ? technical.atr : null;
  const signal = ["BUY", "SELL", "WAIT"].includes(String(technical.signal)) ? technical.signal : "WAIT";

  if (price === null || ema20 === null || ema50 === null || rsi === null || atr === null) {
    return NextResponse.json({ error: "Data teknikal belum lengkap untuk dianalisa." }, { status: 400 });
  }

  const prompt = [
    "Buat ringkasan riset fundamental Forex terkini dalam Bahasa Indonesia untuk pair berikut.",
    `Pair: ${pair}. Timeframe teknikal: ${interval}.`,
    "Gunakan Google Search untuk mencari kondisi terkini kedua mata uang: keputusan/ekspektasi suku bunga dan komunikasi bank sentral, inflasi, tenaga kerja/pertumbuhan, imbal hasil atau sentimen risiko, serta agenda ekonomi mendatang yang relevan.",
    "Utamakan sumber primer (bank sentral, kantor statistik, kalender/rilis resmi). Bedakan fakta terbaru, ekspektasi pasar, dan interpretasi. Sebut tanggal atau waktu sumber bila tersedia. Jangan mengarang angka, rilis, atau tanggal; nyatakan bila sumber terkini tidak ditemukan.",
    "Jangan memberi instruksi transaksi, rekomendasi beli/jual, kepastian arah, atau probabilitas buatan. Berikan bias fundamental naik/turun/netral hanya sebagai ringkasan faktor yang mendukung, faktor yang berlawanan, risiko/event berikutnya, dan kondisi yang akan mengubah pandangan. Bila bukti berimbang atau tidak cukup, nyatakan netral/tidak cukup data.",
    "Konteks indikator teknikal aplikasi (bukan fakta fundamental): " +
      JSON.stringify({ price, ema20, ema50, rsi, atr, signal }),
    "Akhiri dengan satu kalimat bahwa ini ringkasan informasional, data berita dapat berubah, dan bukan saran investasi.",
  ].join("\n");

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        tools: [{ type: "google_search" }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    const responseBody = await response.text();
    let data: GeminiResponse = {};
    try {
      data = JSON.parse(responseBody) as GeminiResponse;
    } catch {
      // Some upstream failures return plain text instead of JSON.
    }

    const providerError = getProviderError(data)
      ?? (!response.ok && responseBody.trim() && response.headers.get("content-type")?.includes("text/plain")
        ? responseBody.trim().slice(0, 500)
        : undefined);
    const safeProviderError = providerError?.replaceAll(apiKey, "[redacted]").slice(0, 500);
    if (!response.ok || data.error || (data.status && data.status !== "completed")) {
      const status = response.status === 401 ? 401
        : response.status === 403 ? 403
          : response.status === 429 ? 429
            : 502;
      const fallbackError = response.status === 401
        ? "Google menolak autentikasi (HTTP 401). Pastikan GEMINI_API_KEY aktif dan berasal dari project yang benar; perbarui environment yang digunakan server, lalu restart lokal atau redeploy Vercel."
        : data.status && data.status !== "completed"
          ? `Penyedia AI mengembalikan status ${data.status}.`
          : `Penyedia AI menolak permintaan (HTTP ${response.status}).`;
      return NextResponse.json(
        {
          error: safeProviderError ?? fallbackError,
        },
        { status },
      );
    }

    const outputSteps = data.steps?.filter((step) => step.type === "model_output") ?? [];
    const textBlocks = outputSteps.flatMap((step) => step.content ?? []).filter((block) => block.type === "text");
    const text = textBlocks.map((block) => block.text ?? "").join("\n\n").trim();
    const citations = textBlocks.flatMap((block) => block.annotations ?? [])
      .filter((annotation) => annotation.type === "url_citation" && typeof annotation.url === "string")
      .flatMap((annotation) => {
        try {
          const url = new URL(annotation.url!);
          if (url.protocol !== "https:" && url.protocol !== "http:") return [];
          return [{ url: url.toString(), title: annotation.title || url.hostname }];
        } catch {
          return [];
        }
      })
      .filter((citation, index, all) => all.findIndex((item) => item.url === citation.url) === index)
      .slice(0, 8);

    if (!text) {
      return NextResponse.json({ error: "AI tidak mengembalikan ringkasan analisa." }, { status: 502 });
    }

    return NextResponse.json(
      { pair, interval, model, text, citations, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Koneksi ke penyedia AI gagal.";
    return NextResponse.json({ error: `Analisa AI gagal: ${message}` }, { status: 502 });
  }
}
