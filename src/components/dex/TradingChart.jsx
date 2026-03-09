import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const INTERVALS = ['15m', '1H', '4H', '1D', '1W'];

function generateMockData(basePrice, points = 120) {
  const data = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = points; i >= 0; i--) {
    const change = (Math.random() - 0.478) * price * 0.007;
    price = Math.max(price + change, price * 0.5);
    data.push({
      time: new Date(now - i * 15 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(price.toFixed(5)),
    });
  }
  return data;
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs shadow-lg">
        <div className="text-white font-mono font-semibold">{payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
        <div className="text-gray-500 mt-0.5">{payload[0].payload.time}</div>
      </div>
    );
  }
  return null;
};

export default function TradingChart({ pair }) {
  const [interval, setInterval] = useState('15m');

  const data = useMemo(() => {
    if (!pair?.current_price) return [];
    return generateMockData(pair.current_price);
  }, [pair?.id, interval]);

  const isUp = data.length > 1 ? data[data.length - 1].price >= data[0].price : true;
  const color = isUp ? '#22c55e' : '#ef4444';
  const gradientId = `grad_${pair?.id || 'default'}`;

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

  return (
    <div className="bg-[#0a0e1a] border-b border-gray-800 flex flex-col" style={{ height: '300px' }}>
      {/* Interval Selector */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-800/60 shrink-0">
        {INTERVALS.map(iv => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              interval === iv ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {iv}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-700 italic">* Demo chart — live data coming tomorrow</div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: '#4b5563', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={23}
            />
            <YAxis
              tick={{ fill: '#4b5563', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(4)}
              domain={['auto', 'auto']}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}