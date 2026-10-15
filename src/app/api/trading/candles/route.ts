import { NextResponse } from "next/server";
import { getUserSession, hasTradingAccess } from "@/lib/auth/session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

const intervals = new Set(["15min", "1h", "4h", "1day"]);
const intervalMilliseconds: Record<string, number> = {
  "15min": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

type ProviderCandle = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
};

type ProviderResponse = {
  status?: string;
  message?: string;
  values?: ProviderCandle[];
};

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Silakan masuk untuk mengakses data ini." }, { status: 401 });
  }
  if (!hasTradingAccess(session)) {
    return NextResponse.json(
      { error: session.tradingAccess.status === "expired"
        ? "Masa akses Trading telah berakhir. Hubungi administrator untuk mengaktifkannya kembali."
        : "Akses Trading Anda masih menunggu persetujuan administrator." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() ?? "";
  const interval = searchParams.get("interval") ?? "";

  if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(symbol)) {
    return NextResponse.json({ error: "Pair harus memakai format Forex, misalnya EUR/USD." }, { status: 400 });
  }

  if (!intervals.has(interval)) {
    return NextResponse.json({ error: "Timeframe tidak didukung." }, { status: 400 });
  }

  const profile = await getFirebaseAdminFirestore().collection("users").doc(session.uid).get();
  const integrations = profile.data()?.integrations;
  const userApiKey = typeof integrations?.twelveDataApiKey === "string"
    ? integrations.twelveDataApiKey.trim()
    : "";
  const apiKey = userApiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Data Forex belum dikonfigurasi. Minta administrator menambahkan API key Twelve Data untuk akun ini." },
      { status: 503 },
    );
  }

  const providerUrl = new URL("https://api.twelvedata.com/time_series");
  providerUrl.searchParams.set("symbol", symbol);
  providerUrl.searchParams.set("interval", interval);
  providerUrl.searchParams.set("outputsize", "500");
  providerUrl.searchParams.set("timezone", "UTC");
  providerUrl.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(providerUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = (await response.json()) as ProviderResponse;

    if (!response.ok || data.status === "error" || !data.values?.length) {
      return NextResponse.json(
        { error: data.message ?? "Penyedia data tidak mengembalikan candle untuk pair ini." },
        { status: 502 },
      );
    }

    const candles = data.values
      .map((candle) => ({
        time: candle.datetime,
        timestamp: Date.parse(`${candle.datetime.replace(" ", "T")}Z`),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      }))
      .filter(
        (candle) =>
          Number.isFinite(candle.timestamp) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close),
      )
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((candle) => candle.timestamp + intervalMilliseconds[interval] <= Date.now());

    if (candles.length < 60) {
      return NextResponse.json(
        { error: "Data historis belum cukup untuk menghitung indikator (minimal 60 candle)." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { symbol, interval, source: "Twelve Data", candles, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Koneksi ke penyedia data gagal.";
    return NextResponse.json({ error: `Gagal mengambil data Forex: ${message}` }, { status: 502 });
  }
}
