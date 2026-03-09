import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { base44 } from '@/api/base44Client';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
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
    const change = (Math.random() - 0.478) * p * 0.007;
    p = Math.max(p + change, p * 0.5);
    data.push({
      time: new Date(now - i * step).toISOString(),
      price: parseFloat(p.toFixed(6)),
      volume: parseFloat((Math.random() * 50 + 5).toFixed(2)),
    });
  }
  return data;
}

const CustomTooltip = ({ active, payload, basePrice }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs shadow-xl">
      <div className="text-white font-mono font-semibold text-sm">
        {d.price?.toLocaleString(undefined, { maximumFractionDigits: basePrice > 100 ? 2 : 6 })}
      </div>
      {d.volume != null && (
        <div className="text-gray-400 mt-0.5">Vol: {d.volume?.toFixed(2)}M</div>
      )}
      <div className="text-gray-600 mt-0.5">
        {d.time ? format(parseISO(d.time), 'MMM d, HH:mm') : ''}
      </div>
    </div>
  );
};

export default function TradingChart({ pair }) {
  const [interval, setIntervalVal] = useState('1H');
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
    const prices = chartData.map(d => d.price);
    const isUp = prices[prices.length - 1] >= prices[0];
    return {
      color: isUp ? '#22c55e' : '#ef4444',
      gradientId: `grad_${pair?.id || 'x'}`,
      minP: Math.min(...prices),
      maxP: Math.max(...prices),
      openPrice: prices[0],
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
      if (interval === '1D' || interval === '1W') return format(d, 'MMM d');
      return format(d, 'HH:mm');
    } catch { return t; }
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

  const priceDomain = [minP * 0.9995, maxP * 1.0005];

  return (
    <div className="bg-[#0a0e1a] border-b border-gray-800 flex flex-col" style={{ height: '300px' }}>
      {/* Toolbar */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-800/60 shrink-0">
        {INTERVALS.map(iv => (
          <button
            key={iv}
            onClick={() => setIntervalVal(iv)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              interval === iv ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {iv}
          </button>
        ))}
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
              <XAxis
                dataKey="time"
                tickFormatter={timeFormatter}
                tick={{ fill: '#4b5563', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="price"
                domain={priceDomain}
                tick={{ fill: '#4b5563', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={tickFormatter}
                width={70}
              />
              <YAxis
                yAxisId="vol"
                orientation="right"
                tick={{ fill: '#2d3748', fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v.toFixed(0)}M`}
                width={30}
              />
              <Tooltip content={<CustomTooltip basePrice={pair?.current_price} />} />
              <ReferenceLine yAxisId="price" y={openPrice} stroke="#374151" strokeDasharray="3 3" strokeWidth={0.8} />
              <Bar yAxisId="vol" dataKey="volume" fill="#6366f1" opacity={0.25} />
              <Area yAxisId="price" type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}