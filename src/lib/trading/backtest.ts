export type BacktestCandle = {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type BacktestTrade = {
  side: "BUY" | "SELL";
  entryTime: string;
  exitTime: string;
  entry: number;
  exit: number;
  resultR: number;
  exitReason: "TARGET" | "STOP" | "TIME";
};

export type BacktestResult = {
  trades: BacktestTrade[];
  wins: number;
  losses: number;
  winRate: number;
  expectancyR: number;
  profitFactor: number | null;
  netR: number;
  returnPercent: number;
  maxDrawdownPercent: number;
  insufficientData: boolean;
};

function ema(values: number[], period: number) {
  if (values.length < period) return null;
  const multiplier = 2 / (period + 1);
  let result = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let index = period; index < values.length; index += 1) {
    result = values[index] * multiplier + result * (1 - multiplier);
  }
  return result;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function atr(candles: BacktestCandle[], period = 14) {
  if (candles.length <= period) return null;
  let total = 0;
  for (let index = candles.length - period; index < candles.length; index += 1) {
    const candle = candles[index];
    const previousClose = candles[index - 1].close;
    total += Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  }
  return total / period;
}

export function runBacktest(
  candles: BacktestCandle[],
  options: { horizon: number; spreadPips: number; pipSize: number; riskPercent: number; startingBalance: number },
): BacktestResult {
  const { horizon, spreadPips, pipSize, riskPercent, startingBalance } = options;
  const trades: BacktestTrade[] = [];
  let lastExitIndex = -1;

  for (let signalIndex = 50; signalIndex <= candles.length - horizon - 1; signalIndex += 1) {
    if (signalIndex <= lastExitIndex) continue;
    const history = candles.slice(0, signalIndex + 1);
    const closes = history.map((candle) => candle.close);
    const price = closes.at(-1) ?? 0;
    const ema20 = ema(closes, 20);
    const ema50 = ema(closes, 50);
    const momentum = rsi(closes);
    const averageRange = atr(history);

    if (ema20 === null || ema50 === null || momentum === null || averageRange === null || averageRange <= 0) continue;

    const bullish = price > ema20 && ema20 > ema50 && momentum >= 50 && momentum < 70;
    const bearish = price < ema20 && ema20 < ema50 && momentum > 30 && momentum <= 50;
    if (!bullish && !bearish) continue;

    const side = bullish ? "BUY" : "SELL";
    const entryIndex = signalIndex + 1;
    const entry = candles[entryIndex].open;
    const stopDistance = averageRange * 1.5;
    const stop = entry + (side === "BUY" ? -stopDistance : stopDistance);
    const target = entry + (side === "BUY" ? stopDistance * 2 : -stopDistance * 2);
    const spreadCostR = Math.max(0, spreadPips) * pipSize / stopDistance;
    const lastPossibleExit = entryIndex + horizon - 1;
    let exitIndex = lastPossibleExit;
    let exit = candles[lastPossibleExit].close;
    let exitReason: BacktestTrade["exitReason"] = "TIME";

    for (let index = entryIndex; index <= lastPossibleExit; index += 1) {
      const candle = candles[index];
      if (side === "BUY") {
        if (candle.open <= stop) {
          exitIndex = index;
          exit = candle.open;
          exitReason = "STOP";
          break;
        }
        if (candle.open >= target) {
          exitIndex = index;
          exit = target;
          exitReason = "TARGET";
          break;
        }
        const stopHit = candle.low <= stop;
        const targetHit = candle.high >= target;
        if (stopHit || targetHit) {
          exitIndex = index;
          exit = stopHit ? stop : target;
          exitReason = stopHit ? "STOP" : "TARGET";
          break;
        }
      } else {
        if (candle.open >= stop) {
          exitIndex = index;
          exit = candle.open;
          exitReason = "STOP";
          break;
        }
        if (candle.open <= target) {
          exitIndex = index;
          exit = target;
          exitReason = "TARGET";
          break;
        }
        const stopHit = candle.high >= stop;
        const targetHit = candle.low <= target;
        if (stopHit || targetHit) {
          exitIndex = index;
          exit = stopHit ? stop : target;
          exitReason = stopHit ? "STOP" : "TARGET";
          break;
        }
      }
    }

    const grossR = (side === "BUY" ? exit - entry : entry - exit) / stopDistance;
    trades.push({
      side,
      entryTime: candles[entryIndex].time,
      exitTime: candles[exitIndex].time,
      entry,
      exit,
      resultR: grossR - spreadCostR,
      exitReason,
    });
    lastExitIndex = exitIndex;
  }

  const wins = trades.filter((trade) => trade.resultR > 0).length;
  const losses = trades.filter((trade) => trade.resultR < 0).length;
  const netR = trades.reduce((sum, trade) => sum + trade.resultR, 0);
  const grossWins = trades.reduce((sum, trade) => sum + Math.max(0, trade.resultR), 0);
  const grossLosses = trades.reduce((sum, trade) => sum + Math.abs(Math.min(0, trade.resultR)), 0);
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdownPercent = 0;

  for (const trade of trades) {
    balance *= 1 + (riskPercent / 100) * trade.resultR;
    peak = Math.max(peak, balance);
    if (peak > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peak - balance) / peak) * 100);
  }

  return {
    trades,
    wins,
    losses,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    expectancyR: trades.length ? netR / trades.length : 0,
    profitFactor: grossLosses ? grossWins / grossLosses : grossWins ? null : 0,
    netR,
    returnPercent: startingBalance > 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0,
    maxDrawdownPercent,
    insufficientData: candles.length < 100,
  };
}
