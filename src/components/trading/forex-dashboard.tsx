"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChartNoAxesCombined,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { runBacktest } from "@/lib/trading/backtest";
import { forecastFromHistory } from "@/lib/trading/forecast";

type Candle = {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type MarketData = {
  symbol: string;
  interval: string;
  source: string;
  candles: Candle[];
  updatedAt: string;
};

type FundamentalReport = {
  pair: string;
  interval: string;
  model: string;
  text: string;
  citations: { url: string; title: string }[];
  generatedAt: string;
};

type Signal = "BUY" | "SELL" | "WAIT";

const intervals = [
  { label: "15 menit", value: "15min" },
  { label: "1 jam", value: "1h" },
  { label: "4 jam", value: "4h" },
  { label: "1 hari", value: "1day" },
];

const defaultPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

function calculateEma(values: number[], period: number) {
  if (values.length < period) return null;
  const initialAverage = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const multiplier = 2 / (period + 1);
  return values.slice(period).reduce(
    (ema, value) => value * multiplier + ema * (1 - multiplier),
    initialAverage,
  );
}

function calculateRsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  const window = changes.slice(-period);
  const averageGain = window.reduce((sum, value) => sum + Math.max(value, 0), 0) / period;
  const averageLoss = window.reduce((sum, value) => sum + Math.max(-value, 0), 0) / period;
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function calculateAtr(candles: Candle[], period = 14) {
  if (candles.length <= period) return null;
  const ranges = candles.slice(1).map((candle, index) => {
    const previousClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });
  const recentRanges = ranges.slice(-period);
  return recentRanges.reduce((sum, range) => sum + range, 0) / period;
}

function formatPrice(value: number, pair: string) {
  const digits = pair.endsWith("/JPY") ? 3 : 5;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function analyzeCandles(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const price = closes.at(-1) ?? 0;
  const ema20 = calculateEma(closes, 20);
  const ema50 = calculateEma(closes, 50);
  const rsi = calculateRsi(closes);
  const atr = calculateAtr(candles);

  const bullishTrend = ema20 !== null && ema50 !== null && price > ema20 && ema20 > ema50;
  const bearishTrend = ema20 !== null && ema50 !== null && price < ema20 && ema20 < ema50;
  const buyMomentum = rsi !== null && rsi >= 50 && rsi < 70;
  const sellMomentum = rsi !== null && rsi > 30 && rsi <= 50;
  const signal: Signal = bullishTrend && buyMomentum
    ? "BUY"
    : bearishTrend && sellMomentum
      ? "SELL"
      : "WAIT";

  const checks = [
    {
      label: `Harga ${bullishTrend ? "di atas" : "tidak di atas"} EMA 20 dan EMA 20 ${ema20 !== null && ema50 !== null && ema20 > ema50 ? "di atas" : "tidak di atas"} EMA 50`,
      passed: bullishTrend,
    },
    {
      label: `RSI ${rsi === null ? "belum tersedia" : rsi.toFixed(1)} ${buyMomentum ? "dalam rentang momentum BUY (50–70)" : "tidak memenuhi rentang momentum BUY (50–70)"}`,
      passed: buyMomentum,
    },
    {
      label: `Harga ${bearishTrend ? "di bawah" : "tidak di bawah"} EMA 20 dan EMA 20 ${ema20 !== null && ema50 !== null && ema20 < ema50 ? "di bawah" : "tidak di bawah"} EMA 50`,
      passed: bearishTrend,
    },
    {
      label: `RSI ${rsi === null ? "belum tersedia" : rsi.toFixed(1)} ${sellMomentum ? "dalam rentang momentum SELL (30–50)" : "tidak memenuhi rentang momentum SELL (30–50)"}`,
      passed: sellMomentum,
    },
  ];

  return { price, ema20, ema50, rsi, atr, signal, checks };
}

function BacktestPanel({
  candles,
  pair,
  horizon,
  loading,
}: {
  candles: Candle[];
  pair: string;
  horizon: number;
  loading: boolean;
}) {
  const [spreadPips, setSpreadPips] = useState(1.2);
  const [riskPercent, setRiskPercent] = useState(1);
  const [startingBalance, setStartingBalance] = useState(10000);
  const pipSize = pair.endsWith("/JPY") ? 0.01 : 0.0001;
  const result = useMemo(
    () => runBacktest(candles, { horizon, spreadPips, pipSize, riskPercent, startingBalance }),
    [candles, horizon, spreadPips, pipSize, riskPercent, startingBalance],
  );
  const number = (value: number, digits = 2) => new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-[15px] font-bold">Backtest strategi</h2>
            <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-500">
              Simulasi historis EMA 20/50 + RSI 14 untuk {pair}. Sinyal dihitung saat candle ditutup, entry pada open berikutnya, biaya spread dikurangkan, dan stop dianggap tersentuh lebih dahulu bila urutannya dalam candle tidak diketahui.
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-bold text-amber-700">
            {candles.length} candle · horizon {horizon} candle
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-[9px] font-semibold text-slate-500">Spread round-trip (pip)</span>
            <input type="number" min="0" step="0.1" value={spreadPips} onChange={(event) => setSpreadPips(Math.max(0, Number(event.target.value)))} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold outline-none focus:border-indigo-400" />
          </label>
          <label>
            <span className="mb-1.5 block text-[9px] font-semibold text-slate-500">Risiko simulasi per trade (%)</span>
            <input type="number" min="0" max="100" step="0.1" value={riskPercent} onChange={(event) => setRiskPercent(Math.min(100, Math.max(0, Number(event.target.value))))} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold outline-none focus:border-indigo-400" />
          </label>
          <label>
            <span className="mb-1.5 block text-[9px] font-semibold text-slate-500">Saldo awal simulasi ({pair.split("/")[1]})</span>
            <input type="number" min="0" step="100" value={startingBalance} onChange={(event) => setStartingBalance(Math.max(0, Number(event.target.value)))} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold outline-none focus:border-indigo-400" />
          </label>
        </div>
      </section>

      {loading ? (
        <section className="rounded-[20px] border border-slate-200/80 bg-white p-8 text-center text-[11px] text-slate-400">Memuat candle untuk backtest...</section>
      ) : result.insufficientData ? (
        <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-[11px] leading-relaxed text-amber-800">
          Backtest memerlukan sedikitnya 100 candle. Data yang tersedia: {candles.length}.
        </section>
      ) : result.trades.length === 0 ? (
        <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-[11px] leading-relaxed text-amber-800">
          Belum ada transaksi yang memenuhi aturan strategi pada riwayat candle ini. Tidak ada metrik performa untuk ditampilkan.
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "Return bersih", value: `${result.returnPercent > 0 ? "+" : ""}${number(result.returnPercent)}%`, note: `${number(result.netR)}R kumulatif`, tone: result.returnPercent >= 0 ? "text-emerald-700" : "text-rose-700" },
              { label: "Win rate", value: `${number(result.winRate, 1)}%`, note: `${result.wins} menang · ${result.losses} kalah`, tone: "text-slate-800" },
              { label: "Profit factor", value: result.profitFactor === null ? "∞*" : number(result.profitFactor), note: "profit kotor ÷ loss kotor", tone: "text-slate-800" },
              { label: "Drawdown maksimum", value: `${number(result.maxDrawdownPercent)}%`, note: `${result.trades.length} transaksi disimulasikan`, tone: "text-rose-700" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[17px] border border-slate-200/80 bg-white p-4">
                <p className="text-[9px] font-semibold text-slate-500">{metric.label}</p>
                <p className={`mt-2 text-[20px] font-bold tracking-tight ${metric.tone}`}>{metric.value}</p>
                <p className="mt-1 text-[9px] text-slate-400">{metric.note}</p>
              </div>
            ))}
          </section>
          <section className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h3 className="text-[13px] font-bold">Transaksi simulasi terbaru</h3>
                <p className="mt-1 text-[9px] text-slate-400">Ekspektasi: {number(result.expectancyR, 3)}R per transaksi</p>
              </div>
              <span className="text-[9px] font-semibold text-slate-400">{pair} · Twelve Data</span>
            </div>
            <div className="divide-y divide-slate-100">
              {result.trades.slice(-10).reverse().map((trade, index) => (
                <div key={`${trade.entryTime}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-center">
                  <div>
                    <p className="text-[10px] font-bold">{trade.side} <span className="ml-1 text-[8px] font-medium text-slate-400">{trade.exitReason}</span></p>
                    <p className="mt-1 text-[8px] text-slate-400">Entry {trade.entryTime}</p>
                  </div>
                  <p className="hidden text-[9px] text-slate-500 sm:block">Exit {trade.exitTime}</p>
                  <p className="hidden text-[9px] text-slate-500 sm:block">In {trade.entry.toFixed(pair.endsWith("/JPY") ? 3 : 5)} → {trade.exit.toFixed(pair.endsWith("/JPY") ? 3 : 5)}</p>
                  <p className={`text-right text-[10px] font-bold sm:text-left ${trade.resultR >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {trade.resultR > 0 ? "+" : ""}{number(trade.resultR, 2)}R
                  </p>
                  <p className="col-span-2 text-[8px] text-slate-400 sm:col-span-1 sm:text-right">{trade.exitTime}</p>
                </div>
              ))}
            </div>
          </section>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[9px] leading-relaxed text-amber-800">
            Hasil adalah simulasi pada data historis terbatas, bukan hasil live atau jaminan. Belum memperhitungkan slippage, swap, eksekusi broker, gap harga secara penuh, dan kualitas tick. Performa masa lalu tidak memprediksi hasil masa depan. *Profit factor tak terdefinisi bila tidak ada kerugian kotor.
          </p>
        </>
      )}
    </div>
  );
}

export function ForexDashboard() {
  const [pairs, setPairs] = useState(defaultPairs);
  const [selectedPair, setSelectedPair] = useState(defaultPairs[0]);
  const [interval, setInterval] = useState("1h");
  const [predictionHorizon, setPredictionHorizon] = useState(3);
  const [view, setView] = useState<"Analisa" | "Watchlist" | "Backtest" | "Aturan">("Analisa");
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [pairInput, setPairInput] = useState("");
  const [pairError, setPairError] = useState("");
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [fundamentalReport, setFundamentalReport] = useState<FundamentalReport | null>(null);
  const [fundamentalLoading, setFundamentalLoading] = useState(false);
  const [fundamentalError, setFundamentalError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadCandles() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ symbol: selectedPair, interval });
        const response = await fetch(`/api/trading/candles?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as MarketData | { error?: string };
        if (!response.ok) {
          throw new Error("error" in result ? result.error : "Data pasar tidak tersedia.");
        }
        if (active && "candles" in result) {
          setMarketData(result);
          setError("");
        }
      } catch (loadError) {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat data Forex.");
          setMarketData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCandles();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setRefreshCount((count) => count + 1);
      }
    }, 5 * 60_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [selectedPair, interval, refreshCount]);

  const analysis = useMemo(
    () => marketData ? analyzeCandles(marketData.candles) : null,
    [marketData],
  );
  const forecast = useMemo(
    () => marketData ? forecastFromHistory(marketData.candles, predictionHorizon) : null,
    [marketData, predictionHorizon],
  );
  const quoteCurrency = selectedPair.split("/")[1] ?? "USD";
  const pipSize = quoteCurrency === "JPY" ? 0.01 : 0.0001;
  const riskAmount = accountBalance * riskPercent / 100;
  const stopDistance = analysis?.atr ? analysis.atr * 1.5 : 0;
  const stopPips = stopDistance / pipSize;
  const positionUnits = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const targetDistance = stopDistance * 2;
  const updatedAt = marketData ? new Date(marketData.updatedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) : "";
  const generatedAt = fundamentalReport
    ? new Date(fundamentalReport.generatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "";

  async function requestFundamentalAnalysis() {
    if (!analysis || !marketData || marketData.symbol !== selectedPair || marketData.interval !== interval) {
      setFundamentalError("Tunggu data teknikal terbaru selesai dimuat.");
      return;
    }

    setFundamentalLoading(true);
    setFundamentalError("");
    setFundamentalReport(null);

    try {
      const response = await fetch("/api/trading/fundamental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedPair,
          interval,
          technical: {
            price: analysis.price,
            ema20: analysis.ema20,
            ema50: analysis.ema50,
            rsi: analysis.rsi,
            atr: analysis.atr,
            signal: analysis.signal,
          },
        }),
      });
      const result = await response.json() as FundamentalReport | { error?: string };
      if (!response.ok || !("text" in result)) {
        throw new Error("error" in result ? result.error : "Analisa fundamental tidak tersedia.");
      }
      setFundamentalReport(result);
    } catch (error) {
      setFundamentalError(error instanceof Error ? error.message : "Gagal meminta analisa fundamental.");
    } finally {
      setFundamentalLoading(false);
    }
  }

  function addPair(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = pairInput.trim().toUpperCase().replace(/[-_]/g, "/");
    if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(normalized)) {
      setPairError("Masukkan pair Forex seperti EUR/USD.");
      return;
    }
    if (pairs.includes(normalized)) {
      setPairError("Pair tersebut sudah ada di watchlist.");
      return;
    }
    setPairs((current) => [...current, normalized]);
    setSelectedPair(normalized);
    setPairInput("");
    setPairError("");
    setView("Analisa");
  }

  function removePair(pair: string) {
    if (pairs.length <= 1) {
      setPairError("Watchlist harus memiliki minimal satu pair.");
      return;
    }
    const remaining = pairs.filter((item) => item !== pair);
    setPairs(remaining);
    if (selectedPair === pair) setSelectedPair(remaining[0]);
  }

  const chartCandles = marketData?.candles.slice(-80) ?? [];
  const chartMin = chartCandles.length ? Math.min(...chartCandles.map((candle) => candle.low)) : 0;
  const chartMax = chartCandles.length ? Math.max(...chartCandles.map((candle) => candle.high)) : 1;
  const chartRange = chartMax - chartMin || chartMax * 0.0001 || 1;
  const chartY = (price: number) => 190 - ((price - chartMin) / chartRange) * 170;
  const chartCandleWidth = Math.max(2, Math.min(7, 640 / Math.max(1, chartCandles.length)));
  const signalStyle = analysis?.signal === "BUY"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : analysis?.signal === "SELL"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const forecastStyle = forecast?.direction === "NAIK"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : forecast?.direction === "TURUN"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const forecastProbability = forecast?.direction === "NAIK"
    ? forecast.probabilityUp
    : forecast?.direction === "TURUN"
      ? forecast.probabilityDown
      : forecast
        ? Math.max(forecast.probabilityUp, forecast.probabilityDown)
        : 0;

  return (
    <div>
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
            <ChartNoAxesCombined size={14} /> Forex · analisa & sinyal
          </p>
          <h1 className="text-[25px] font-bold tracking-[-0.04em] sm:text-[30px]">Analisa Forex</h1>
          <p className="mt-1 text-[12px] text-slate-500">Pantau pair pilihan dan pahami aturan di balik setiap sinyal.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 sm:self-auto">
          <span className={`size-1.5 rounded-full ${error ? "bg-rose-500" : loading ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
          {error ? "Data tidak tersedia" : loading ? "Memuat data..." : `Twelve Data · diperbarui ${updatedAt} UTC`}
        </div>
      </header>

      <div className="mb-5 flex gap-1 rounded-xl border border-slate-200/80 bg-white p-1">
        {(["Analisa", "Watchlist", "Backtest", "Aturan"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-[11px] font-semibold transition ${
              view === tab ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {view === "Watchlist" ? (
        <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
          <h2 className="text-[14px] font-bold">Pair yang dipantau</h2>
          <p className="mt-1 text-[10px] text-slate-400">Tambahkan pair Forex dengan format BASE/QUOTE, misalnya EUR/USD.</p>
          <form onSubmit={addPair} className="mt-4 flex gap-2">
            <input
              value={pairInput}
              onChange={(event) => setPairInput(event.target.value)}
              placeholder="Contoh: EUR/USD"
              aria-label="Pair baru"
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button type="submit" className="flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-semibold text-white hover:bg-indigo-700">
              <Plus size={15} /> Tambah
            </button>
          </form>
          {pairError && <p role="alert" className="mt-2 text-[10px] font-medium text-rose-600">{pairError}</p>}
          <div className="mt-4 divide-y divide-slate-100">
            {pairs.map((pair) => (
              <div key={pair} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => { setSelectedPair(pair); setView("Analisa"); }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-600">
                    {pair.slice(0, 3)}
                  </span>
                  <span>
                    <span className="block text-[12px] font-bold">{pair}</span>
                    <span className="mt-0.5 block text-[9px] text-slate-400">Forex spot · Twelve Data</span>
                  </span>
                  <ArrowRight size={14} className="ml-auto text-slate-300" />
                </button>
                <button onClick={() => removePair(pair)} aria-label={`Hapus ${pair}`} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : view === "Backtest" ? (
        <BacktestPanel
          candles={marketData?.candles ?? []}
          pair={selectedPair}
          horizon={predictionHorizon}
          loading={loading}
        />
      ) : view === "Aturan" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
            <h2 className="text-[14px] font-bold">Strategi tren + momentum</h2>
            <p className="mt-1 text-[10px] text-slate-400">Aturan deterministik yang sama diterapkan pada candle tertutup pair terpilih.</p>
            <div className="mt-4 space-y-3">
              {[
                { title: "BUY", color: "bg-emerald-50 text-emerald-700", details: "Harga penutupan di atas EMA 20, EMA 20 di atas EMA 50, dan RSI 14 berada di 50–70." },
                { title: "SELL", color: "bg-rose-50 text-rose-700", details: "Harga penutupan di bawah EMA 20, EMA 20 di bawah EMA 50, dan RSI 14 berada di 30–50." },
                { title: "WAIT", color: "bg-amber-50 text-amber-700", details: "Kondisi BUY atau SELL belum lengkap. Tidak ada sinyal entry." },
              ].map((rule) => (
                <div key={rule.title} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                  <span className={`h-fit rounded-md px-2 py-1 text-[9px] font-bold ${rule.color}`}>{rule.title}</span>
                  <p className="text-[11px] leading-relaxed text-slate-600">{rule.details}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              Stop loss ilustratif = 1,5 × ATR 14; target ilustratif = 2 × jarak stop (rasio 1:2). Perhitungan tidak memasukkan spread, komisi, swap, slippage, atau konversi mata uang akun.
            </p>
          </section>
          <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-amber-900"><ShieldCheck size={16} /> Batasan penting</h2>
            <ul className="mt-3 space-y-2 text-[10px] leading-relaxed text-amber-900/80">
              <li>• Indikator teknikal bersifat tertinggal dan dapat menghasilkan sinyal keliru.</li>
              <li>• Data Forex dari penyedia dapat tertunda dan berbeda antar broker.</li>
              <li>• Backtest, forward test, dan pemeriksaan spread diperlukan sebelum strategi dipakai.</li>
              <li>• Aplikasi ini hanya memberi informasi; tidak mengirim order ke broker.</li>
            </ul>
          </section>
        </div>
      ) : (
        <>
          <section className="mb-4 rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                {pairs.map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    className={`rounded-lg px-3 py-2 text-[10px] font-bold ${
                      selectedPair === pair ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {pair}
                  </button>
                ))}
                <button onClick={() => setView("Watchlist")} aria-label="Tambah pair ke watchlist" className="grid size-8 place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600">
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="forex-interval">Timeframe</label>
                <select
                  id="forex-interval"
                  value={interval}
                  onChange={(event) => setInterval(event.target.value)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none focus:border-indigo-400 sm:flex-none"
                >
                  {intervals.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <button
                  onClick={() => setRefreshCount((count) => count + 1)}
                  aria-label="Perbarui data"
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </section>

          {error ? (
            <section role="alert" className="mb-4 rounded-[20px] border border-rose-200 bg-rose-50 p-5">
              <h2 className="text-[13px] font-bold text-rose-800">Analisa belum tersedia</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-rose-700">{error}</p>
              {error.includes("Data Forex belum dikonfigurasi") && (
                <p className="mt-2 text-[10px] text-rose-700">Minta administrator menambahkan API key Twelve Data untuk akun Anda.</p>
              )}
              <button onClick={() => setRefreshCount((count) => count + 1)} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-[10px] font-semibold text-white">
                Coba lagi
              </button>
            </section>
          ) : null}

          <section className="mb-4 rounded-[20px] border border-indigo-100 bg-white p-4 shadow-sm shadow-indigo-100/40 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ChartNoAxesCombined size={19} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Prediksi statistik · {selectedPair}</p>
                  <h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">Kecenderungan beberapa candle ke depan</h2>
                  <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-500">
                    Membandingkan tren EMA, RSI, dan momentum sekarang dengan kondisi historis serupa pada pair dan timeframe ini.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[9px] font-semibold text-slate-500">
                Horizon
                <select
                  value={predictionHorizon}
                  onChange={(event) => setPredictionHorizon(Number(event.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
                >
                  {[1, 3, 6].map((bars) => <option key={bars} value={bars}>{bars} candle</option>)}
                </select>
              </label>
            </div>

            {forecast && forecast.direction !== "DATA_KURANG" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1.3fr]">
                <div className={`rounded-xl border p-3 ${forecastStyle}`}>
                  <p className="text-[8px] font-bold uppercase tracking-wide opacity-70">Arah historis</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-extrabold">
                    {forecast.direction === "NAIK" ? <TrendingUp size={16} /> : forecast.direction === "TURUN" ? <TrendingDown size={16} /> : <Activity size={15} />}
                    {forecast.direction}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Frekuensi arah serupa</p>
                  <p className="mt-1.5 text-[15px] font-extrabold text-slate-800">{forecastProbability.toFixed(0)}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Median pergerakan lampau</p>
                  <p className={`mt-1.5 text-[15px] font-extrabold ${forecast.expectedMovePercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {forecast.expectedMovePercent > 0 ? "+" : ""}{forecast.expectedMovePercent.toFixed(3)}%
                  </p>
                </div>
                <div className="rounded-xl bg-indigo-50/70 p-3">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-indigo-500">Pembanding historis</p>
                  <p className="mt-1.5 text-[12px] font-bold text-indigo-900">{forecast.samples} kondisi serupa · {predictionHorizon} candle</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-indigo-700/70">
                    {forecast.direction === "NETRAL"
                      ? "Arah belum cukup dominan untuk menghasilkan kecenderungan."
                      : "Frekuensi berbobot dari analog historis, bukan peluang terkalibrasi."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">
                {loading
                  ? "Menyiapkan pembanding dari candle historis..."
                  : forecast?.samples
                    ? `Belum cukup kondisi historis yang sebanding (${forecast.samples} sampel). Tunggu data tambahan atau pilih horizon yang lebih pendek.`
                    : "Prediksi memerlukan minimal 15 kondisi historis sebanding. Penyedia data mengirim hingga 500 candle; hasil tidak ditampilkan jika sampelnya belum memadai."}
              </div>
            )}
            <p className="mt-3 text-[9px] leading-relaxed text-slate-400">
              Prediksi ini adalah ringkasan statistik analog historis tertutup, bukan machine learning atau jaminan arah harga. Kondisi pasar dapat berubah; uji strategi dan pertimbangkan spread sebelum mengambil keputusan.
            </p>
          </section>

              <section className="mb-4 rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-600">Riset fundamental dengan AI</p>
                    <h2 className="mt-1 text-[14px] font-bold">Konteks terbaru untuk {selectedPair}</h2>
                    <p className="mt-1 text-[10px] text-slate-500">Gemini menelusuri web untuk faktor ekonomi dan menyertakan tautan sumber.</p>
                  </div>
                  <button
                    onClick={requestFundamentalAnalysis}
                    disabled={fundamentalLoading || loading || !analysis || !marketData || marketData.symbol !== selectedPair || marketData.interval !== interval}
                    className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-[10px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <RefreshCw size={13} className={fundamentalLoading ? "animate-spin" : ""} />
                    {fundamentalLoading ? "Mencari sumber..." : fundamentalReport ? "Analisa ulang" : "Analisa fundamental"}
                  </button>
                </div>
                {fundamentalError && (
                  <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-[10px] leading-relaxed text-rose-700">{fundamentalError}</p>
                )}
                {fundamentalReport && fundamentalReport.pair === selectedPair && fundamentalReport.interval === interval && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-3 text-[9px] text-slate-400">
                      Model {fundamentalReport.model} · dibuat {generatedAt}
                    </p>
                    <div className="whitespace-pre-wrap text-[11px] leading-[1.8] text-slate-700">{fundamentalReport.text}</div>
                    {fundamentalReport.citations.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Sumber yang dikutip Gemini</p>
                        <ul className="space-y-1.5">
                          {fundamentalReport.citations.map((citation) => (
                            <li key={citation.url}>
                              <a href={citation.url} target="_blank" rel="noreferrer" className="break-all text-[9px] font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-800">
                                {citation.title} <span aria-hidden="true">↗</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fundamentalReport.citations.length === 0 && (
                      <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-[9px] text-amber-800">
                        Gemini tidak menyertakan sitasi untuk ringkasan ini. Verifikasi informasi secara mandiri sebelum menggunakannya.
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-3 text-[9px] leading-relaxed text-slate-400">
                  Riset AI berjalan hanya saat diminta dan dapat menggunakan kuota API. AI dapat salah menginterpretasikan sumber; ini bukan rekomendasi investasi atau kepastian arah harga.
                </p>
              </section>

              <div className="mb-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="min-w-0 rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">PAIR TERPILIH · {interval.toUpperCase()}</p>
                  <h2 className="mt-1 text-[19px] font-bold tracking-tight">{selectedPair}</h2>
                  {analysis && <p className="mt-1 text-[20px] font-bold">{formatPrice(analysis.price, selectedPair)}</p>}
                </div>
                {analysis && (
                  <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-extrabold ${signalStyle}`}>
                    {analysis.signal === "BUY" ? <TrendingUp size={15} /> : analysis.signal === "SELL" ? <TrendingDown size={15} /> : <Activity size={15} />}
                    {analysis.signal}
                  </span>
                )}
              </div>
              <div className="relative mt-4 h-[180px] overflow-hidden rounded-xl bg-[#fafbff] px-1 pt-2 sm:h-[230px]">
                <div className="absolute inset-x-2 top-1/4 border-t border-dashed border-slate-200" />
                <div className="absolute inset-x-2 top-2/4 border-t border-dashed border-slate-200" />
                <div className="absolute inset-x-2 top-3/4 border-t border-dashed border-slate-200" />
                {chartCandles.length > 0 && (
                  <svg viewBox="0 0 720 200" preserveAspectRatio="none" className="relative h-full w-full" role="img" aria-label={`Grafik candle close ${selectedPair}`}>
                    {chartCandles.map((candle, index) => {
                      const x = ((index + 0.5) / chartCandles.length) * 720;
                      const openY = chartY(candle.open);
                      const closeY = chartY(candle.close);
                      const rising = candle.close >= candle.open;
                      const color = rising ? "#059669" : "#e11d48";
                      const bodyTop = Math.min(openY, closeY);
                      const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
                      return (
                        <g key={`${candle.timestamp}-${index}`}>
                          <title>{`${candle.time} · O ${formatPrice(candle.open, selectedPair)} · H ${formatPrice(candle.high, selectedPair)} · L ${formatPrice(candle.low, selectedPair)} · C ${formatPrice(candle.close, selectedPair)}`}</title>
                          <line x1={x} x2={x} y1={chartY(candle.high)} y2={chartY(candle.low)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                          <rect x={x - chartCandleWidth / 2} y={bodyTop} width={chartCandleWidth} height={bodyHeight} fill={color} rx=".5" />
                        </g>
                      );
                    })}
                  </svg>
                )}
                {!chartCandles.length && <div className="absolute inset-0 grid place-items-center text-[11px] text-slate-400">{loading ? "Mengambil candle..." : "Grafik akan tampil saat data tersedia."}</div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-400">
                <span>80 candle OHLC tertutup terakhir · arah: hijau naik, merah turun</span>
                <span>Sumber: {marketData?.source ?? "Twelve Data"}</span>
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-bold">Hasil analisa</h2>
                  <p className="mt-1 text-[10px] text-slate-400">Strategi EMA 20/50 + RSI 14</p>
                </div>
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Activity size={15} /></span>
              </div>
              {analysis ? (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "EMA 20", value: analysis.ema20 === null ? "—" : formatPrice(analysis.ema20, selectedPair) },
                      { label: "EMA 50", value: analysis.ema50 === null ? "—" : formatPrice(analysis.ema50, selectedPair) },
                      { label: "RSI 14", value: analysis.rsi === null ? "—" : analysis.rsi.toFixed(1) },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg bg-slate-50 p-2">
                        <p className="text-[8px] font-semibold text-slate-400">{metric.label}</p>
                        <p className="mt-1 truncate text-[10px] font-bold text-slate-700">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(analysis.signal === "BUY"
                      ? analysis.checks.slice(0, 2)
                      : analysis.signal === "SELL"
                        ? analysis.checks.slice(2)
                        : analysis.checks
                    ).map((check) => (
                      <div key={check.label} className="flex gap-2 text-[10px] leading-relaxed text-slate-600">
                        <span className={`mt-1 size-1.5 shrink-0 rounded-full ${check.passed ? "bg-emerald-500" : "bg-slate-300"}`} />
                        {check.label}
                      </div>
                    ))}
                  </div>
                  {analysis.signal !== "WAIT" && analysis.atr !== null && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <div><p className="text-[8px] font-semibold text-slate-400">STOP ILUSTRATIF · 1,5 ATR</p><p className="mt-1 text-[10px] font-bold">{formatPrice(analysis.price + (analysis.signal === "BUY" ? -1 : 1) * analysis.atr * 1.5, selectedPair)}</p></div>
                      <div><p className="text-[8px] font-semibold text-slate-400">TARGET · 2R</p><p className="mt-1 text-[10px] font-bold">{formatPrice(analysis.price + (analysis.signal === "BUY" ? 1 : -1) * analysis.atr * 3, selectedPair)}</p></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid min-h-[150px] place-items-center text-center text-[11px] text-slate-400">
                  {loading ? "Menghitung indikator dari candle tertutup..." : "Data belum cukup untuk membuat analisa."}
                </div>
              )}
              <p className="mt-4 rounded-lg bg-amber-50 p-2.5 text-[9px] leading-relaxed text-amber-800">
                Sinyal berbasis aturan, bukan prediksi pasti atau rekomendasi investasi.
              </p>
            </section>
          </div>

          <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-bold">Manajemen risiko</h2>
                <p className="mt-1 text-[10px] text-slate-400">Estimasi ukuran posisi dari volatilitas pair terpilih.</p>
              </div>
              <ShieldCheck size={17} className="text-emerald-600" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="mb-1.5 block text-[9px] font-semibold text-slate-500">Saldo akun ({quoteCurrency})</span>
                <input type="number" min="0" value={accountBalance} onChange={(event) => setAccountBalance(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold outline-none focus:border-indigo-400" />
              </label>
              <label>
                <span className="mb-1.5 block text-[9px] font-semibold text-slate-500">Risiko per posisi (%)</span>
                <input type="number" min="0" max="100" step="0.1" value={riskPercent} onChange={(event) => setRiskPercent(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold outline-none focus:border-indigo-400" />
              </label>
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-[8px] font-semibold text-rose-600">RISIKO MAKSIMAL</p>
                <p className="mt-1 text-[12px] font-bold text-rose-700">{riskAmount.toFixed(2)} {quoteCurrency}</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-[8px] font-semibold text-indigo-600">UKURAN POSISI · ESTIMASI</p>
                <p className="mt-1 text-[12px] font-bold text-indigo-800">{positionUnits.toFixed(0)} unit · {stopPips.toFixed(1)} pip SL</p>
              </div>
            </div>
            {analysis?.signal !== "WAIT" && analysis?.signal && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-[10px]">
                <span className="text-slate-500">Target ilustratif (2R) · {targetDistance > 0 ? `${(targetDistance / pipSize).toFixed(1)} pip` : "—"}</span>
                <span className="font-semibold text-slate-700">Kalkulasi dalam {quoteCurrency}</span>
              </div>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-400">
              <Clock3 size={11} className="mt-0.5 shrink-0" />
              Estimasi mengasumsikan saldo akun dalam {quoteCurrency}; tidak termasuk spread, komisi, swap, slippage, leverage, atau konversi mata uang.
            </p>
          </section>
        </>
      )}

      <p className="mt-5 text-center text-[9px] leading-relaxed text-slate-400">
        Data pasar disediakan Twelve Data dan dapat tertunda. Analisa hanya untuk edukasi, bukan saran investasi; aplikasi tidak mengeksekusi transaksi.
      </p>
    </div>
  );
}
