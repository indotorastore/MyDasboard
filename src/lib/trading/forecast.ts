export type ForecastCandle = {
  close: number;
};

export type HistoricalForecast = {
  direction: "NAIK" | "TURUN" | "NETRAL" | "DATA_KURANG";
  probabilityUp: number;
  probabilityDown: number;
  expectedMovePercent: number;
  samples: number;
  horizon: number;
};

type MarketState = {
  trend: -1 | 0 | 1;
  rsi: number;
  emaGap: number;
  momentum: number;
};

type Analogue = {
  distance: number;
  forwardReturn: number;
};

function emaAt(values: number[], end: number, period: number) {
  if (end + 1 < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let index = period; index <= end; index += 1) {
    ema = values[index] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

function rsiAt(values: number[], end: number, period = 14) {
  if (end < period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = end - period + 1; index <= end; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function stateAt(values: number[], index: number): MarketState | null {
  const ema20 = emaAt(values, index, 20);
  const ema50 = emaAt(values, index, 50);
  const rsi = rsiAt(values, index);
  if (ema20 === null || ema50 === null || rsi === null || values[index - 3] === 0) return null;

  const price = values[index];
  const trend: MarketState["trend"] =
    price > ema20 && ema20 > ema50 ? 1 :
      price < ema20 && ema20 < ema50 ? -1 : 0;

  return {
    trend,
    rsi,
    emaGap: ((price - ema20) / price) * 100,
    momentum: ((price - values[index - 3]) / values[index - 3]) * 100,
  };
}

function stateDistance(left: MarketState, right: MarketState) {
  const trendPenalty = left.trend === right.trend ? 0 : left.trend === 0 || right.trend === 0 ? 1.5 : 3;
  const rsiDistance = (left.rsi - right.rsi) / 20;
  const emaGapDistance = (left.emaGap - right.emaGap) / 0.15;
  const momentumDistance = (left.momentum - right.momentum) / 0.2;
  return Math.sqrt(
    trendPenalty ** 2 +
    rsiDistance ** 2 +
    emaGapDistance ** 2 +
    momentumDistance ** 2,
  );
}

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function forecastFromHistory(
  candles: ForecastCandle[],
  horizon: number,
  neighborLimit = 30,
): HistoricalForecast {
  const values = candles.map((candle) => candle.close);
  const empty: HistoricalForecast = {
    direction: "DATA_KURANG",
    probabilityUp: 0,
    probabilityDown: 0,
    expectedMovePercent: 0,
    samples: 0,
    horizon,
  };

  if (!Number.isInteger(horizon) || horizon < 1 || values.length < 60 + horizon) return empty;

  const currentIndex = values.length - 1;
  const currentState = stateAt(values, currentIndex);
  if (!currentState) return empty;

  const analogues: Analogue[] = [];
  const step = Math.max(1, horizon);

  for (let index = 50; index <= currentIndex - horizon; index += step) {
    const historicalState = stateAt(values, index);
    if (!historicalState) continue;

    const start = values[index];
    const end = values[index + horizon];
    if (start <= 0 || !Number.isFinite(end)) continue;

    analogues.push({
      distance: stateDistance(currentState, historicalState),
      forwardReturn: ((end - start) / start) * 100,
    });
  }

  const nearest = analogues
    .sort((a, b) => a.distance - b.distance)
    .slice(0, neighborLimit);

  if (nearest.length < 15) {
    return { ...empty, samples: nearest.length };
  }

  const weights = nearest.map((sample) => 1 / (1 + sample.distance));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilityUp = nearest.reduce(
    (sum, sample, index) => sum + (sample.forwardReturn > 0 ? weights[index] : 0),
    0,
  ) / totalWeight;
  const probabilityDown = nearest.reduce(
    (sum, sample, index) => sum + (sample.forwardReturn < 0 ? weights[index] : 0),
    0,
  ) / totalWeight;
  const expectedMovePercent = median(nearest.map((sample) => sample.forwardReturn));

  const direction: HistoricalForecast["direction"] =
    probabilityUp >= 0.6 && expectedMovePercent > 0 ? "NAIK" :
      probabilityDown >= 0.6 && expectedMovePercent < 0 ? "TURUN" : "NETRAL";

  return {
    direction,
    probabilityUp: probabilityUp * 100,
    probabilityDown: probabilityDown * 100,
    expectedMovePercent,
    samples: nearest.length,
    horizon,
  };
}
