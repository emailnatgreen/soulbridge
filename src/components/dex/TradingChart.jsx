import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Customized } from 'recharts';
import { base44 } from '@/api/base44Client';
import { Loader2, Wifi, WifiOff, CandlestickChart, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const INTERVALS = ['15m', '1H', '4H', '1D', '1W'];

function generateFallback(basePrice, interval) {
  const points = { '15m': 96, '1H': 72, '4H': 60, '1D': 90, '1W': 52 };
  const n = points[interval] || 72;
  const msStep = { '15m': 15*60000, '1H': 3600000, '4H': 4*3600000, '1D': 86400000, '1W': 7*86400000 };
  const step = msStep[interval] || 3600000;
  const data = [];
  let p = basePrice;
  const now = Date.now();
  for (let i = n; i >= 0; i--) {
    const prev = p;
    const change = (Math.random() - 0.478) * p * 0.007;
    p = Math.max(p + change, p * 0.5);
    const hi = Math.max(prev, p) * (1 + Math.random() * 0.003);
    const lo = Math.min(prev, p) * (1 - Math.random() * 0.003);
    data.push({
      time: new Date(now - i * step).toISOString(),
      open: parseFloat(prev.toFixed(6)),
      high: parseFloat(hi.toFixed(6)),
      low: parseFloat(lo.toFixed(6)),
      close: parseFloat(p.toFixed(6)),
      price: parseFloat(p.toFixed(6)),
      volume: parseFloat((Math.random() * 50 + 5).toFixed(2)),
    });
  }
  return data;
}

// Recharts Customized candlestick layer
const CandleLayer = ({ xAxisMap, yAxisMap, data }) => {
  const xAxis = xAxisMap?.[0];
  const yAxis = yAxisMap?.['price'];
  if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const barW = Math.max(Math.min((xAxis.width || 500) / data.length * 0.65, 10), 1.5);

  return (
    <g>
      {data.map((d, i) => {
        const cx = xScale(d.time);
        if (cx == null || isNaN(cx)) return null;
        const o = d.open ?? d.price;
        const c = d.close ?? d.price;
        const h = d.high ?? c;
        const l = d.low ?? c;
        const yH = yScale(h), yL = yScale(l);
        const yO = yScale(o), yC = yScale(c);
        if ([yH, yL, yO, yC].some(v => v == null || isNaN(v))) return null;
        const isUp = c >= o;
        const fill = isUp ? '#22c55e' : '#ef4444';
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(Math.abs(yC - yO), 1);
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={fill} strokeWidth={1} opacity={0.7} />
            <rect x={cx - barW / 2} y={bodyTop} width={barW} height={bodyH} fill={fill} opacity={0.9} />
          </g>
        );
      })}
    </g>
  );
};

const CustomTooltip = ({ active, payload, chartType }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const isUp = (d.close ?? d.price) >= (d.open ?? d.price);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs shadow-xl">
      {chartType === 'candle' && d.open != null ? (
        <>
          <div className={`font-mono font-bold text-sm mb-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            C: {d.close?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </div>
          <div className="text-gray-400 space-y-0.5">
            <div>O: {d.open?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            <div className="text-green-500">H: {d.high?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            <div className="text-red-500">L: {d.low?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
          </div>
        </>
      ) : (
        <div className="text-white font-mono font-semibold text-sm">
          {d.price?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
        </div>
      )}
      {d.volume != null && <div className="text-gray-500 mt-1">Vol: {d.volume?.toFixed(2)}M</div>}
      <div className="text-gray-600 mt-0.5">
        {d.time ? (() => { try { return format(parseISO(d.time), 'MMM d, HH:mm'); } catch { return ''; } })() : ''}
      </div>
    </div>
  );
};

export default function TradingChart({ pair }) {
  const [interval, setIntervalVal] = useState('1H');
  const [chartType, setChartType] = useState('candle');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    if (!pair) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fetchChartData', {
        symbol: pair.symbol,
        asset_class: pair.asset_class,
        interval,
      });
      if (res.data?.success && res.data.data?.length > 0) {
        setChartData(res.data.data);
        setIsLive(res.data.source === 'coingecko');
      } else {
        setChartData(generateFallback(pair.current_price || 100, interval));
        setIsLive(false);
      }
    } catch {
      setChartData(generateFallback(pair.current_price || 100, interval));
      setIsLive(false);
    }
    setLoading(false);
  }, [pair?.id, pair?.symbol, interval]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { color, gradientId, minP, maxP, openPrice } = useMemo(() => {
    if (!chartData.length) return { color: '#22c55e', gradientId: 'g1', minP: 0, maxP: 0, openPrice: 0 };
    const closes = chartData.map(d => d.close ?? d.price);
    const lows = chartData.map(d => d.low ?? d.price);
    const highs = chartData.map(d => d.high ?? d.price);
    const isUp = closes[closes.length - 1] >= closes[0];
    return {
      color: isUp ? '#22c55e' : '#ef4444',
      gradientId: `grad_${pair?.id || 'x'}`,
      minP: Math.min(...lows),
      maxP: Math.max(...highs),
      openPrice: closes[0],
    };
  }, [chartData, pair?.id]);

  const tickFormatter = (v) => {
    const p = pair?.current_price || 1;
    if (p > 10000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (p > 100) return v.toFixed(2);
    if (p > 1) return v.toFixed(3);
    return v.toFixed(5);
  };

  const timeFormatter = (t) => {
    if (!t) return '';
    try {
      const d = parseISO(t);
      return (interval === '1D' || interval === '1W') ? format(d, 'MMM d') : format(d, 'HH:mm');
    } catch { return ''; }
  };

  if (!pair) {
    return (
      <div className="flex-1 bg-[#0a0e1a] flex items-center justify-center border-b border-gray-800">
        <div className="text-center">
          <div className="text-4xl mb-3">⚡</div>
          <div className="text-gray-500 text-sm">Select a market to view chart</div>
        </div>
      </div>
    );
  }

  const priceDomain = [minP * 0.9992, maxP * 1.0008];

  return (
    <div className="bg-[#0a0e1a] border-b border-gray-800 flex flex-col" style={{ height: '300px' }}>
      {/* Toolbar */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-800/60 shrink-0">
        {INTERVALS.map(iv => (
          <button key={iv} onClick={() => setIntervalVal(iv)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${interval === iv ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>
            {iv}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <button onClick={() => setChartType(t => t === 'candle' ? 'area' : 'candle')}
          title="Toggle chart type"
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${chartType === 'candle' ? 'text-purple-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>
          <CandlestickChart className="w-3 h-3" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          {loading && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
          {isLive
            ? <span className="flex items-center gap-1 text-[10px] text-green-400"><Wifi className="w-2.5 h-2.5" /> Live</span>
            : <span className="flex items-center gap-1 text-[10px] text-gray-600"><WifiOff className="w-2.5 h-2.5" /> Indicative</span>
          }
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        {chartData.length === 0 && loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 6, right: 16, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tickFormatter={timeFormatter}
                tick={{ fill: '#4b5563', fontSize: 9 }} tickLine={false} axisLine={false}
                interval="preserveStartEnd" />
              <YAxis yAxisId="price" domain={priceDomain}
                tick={{ fill: '#4b5563', fontSize: 9 }} tickLine={false} axisLine={false}
                tickFormatter={tickFormatter} width={70} />
              <YAxis yAxisId="vol" orientation="right"
                tick={{ fill: '#2d3748', fontSize: 8 }} tickLine={false} axisLine={false}
                tickFormatter={v => `${v.toFixed(0)}M`} width={30} />
              <Tooltip content={<CustomTooltip chartType={chartType} />} />
              <ReferenceLine yAxisId="price" y={openPrice} stroke="#374151" strokeDasharray="3 3" strokeWidth={0.8} />
              <Bar yAxisId="vol" dataKey="volume" fill="#6366f1" opacity={0.2} />
              {chartType === 'area' ? (
                <Area yAxisId="price" type="monotone" dataKey="price" stroke={color} strokeWidth={1.5}
                  fill={`url(#${gradientId})`} dot={false} />
              ) : (
                <>
                  {/* Invisible area to anchor yAxis domain */}
                  <Area yAxisId="price" type="monotone" dataKey="close" stroke="transparent"
                    fill="transparent" dot={false} />
                  <Customized component={(props) => <CandleLayer {...props} data={chartData} />} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}