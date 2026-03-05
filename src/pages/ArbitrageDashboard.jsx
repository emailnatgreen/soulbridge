import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Zap, Activity, Target, Shield, AlertTriangle, CheckCircle2, Clock, BarChart3, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import moment from 'moment';
import PerformanceStandardsPanel from '@/components/arbitrage/PerformanceStandardsPanel';
import ExecutionQualityPanel from '@/components/arbitrage/ExecutionQualityPanel';
import StatisticalValidationPanel from '@/components/arbitrage/StatisticalValidationPanel';
import AuditLogPanel from '@/components/arbitrage/AuditLogPanel';
import EmergencyStopControl from '@/components/arbitrage/EmergencyStopControl';

// XRPL DEX pairs to monitor for arbitrage
const MONITORED_PAIRS = [
  { base: 'XRP', quote: 'RLUSD', issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', label: 'XRP/RLUSD' },
  { base: 'XRP', quote: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', label: 'XRP/USD (Bitstamp)' },
  { base: 'XRP', quote: 'BTC', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', label: 'XRP/BTC' },
];

// Multi-market config
const MULTI_MARKETS = [
  { id: 'xrp', label: 'XRP/USD', color: '#3b82f6', strategy: 'Arbitrage', category: 'Crypto' },
  { id: 'doge', label: 'DOGE/USDT', color: '#f59e0b', strategy: 'T-Wave + Sniping', category: 'Crypto' },
  { id: 'vet', label: 'VET/USDT', color: '#10b981', strategy: 'T-Wave', category: 'Crypto' },
  { id: 'gbpusd', label: 'GBP/USD', color: '#8b5cf6', strategy: 'Sniping', category: 'FX' },
  { id: 'eurusd', label: 'EUR/USD', color: '#6366f1', strategy: 'T-Wave + Sniping', category: 'FX' },
  { id: 'xauusd', label: 'XAU/USD (Gold)', color: '#d97706', strategy: 'T-Wave', category: 'Commodity' },
];

// Fetch multi-market prices from CoinGecko (free, no key)
async function fetchMultiMarketPrices() {
  try {
    const [cryptoRes, fxRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple,dogecoin,vechain&vs_currencies=usd'),
      fetch('https://api.exchangerate-api.com/v4/latest/USD'),
    ]);
    const crypto = await cryptoRes.json();
    const fx = await fxRes.json();
    return {
      xrp: crypto?.ripple?.usd || null,
      doge: crypto?.dogecoin?.usd || null,
      vet: crypto?.vechain?.usd || null,
      gbpusd: fx?.rates?.GBP ? (1 / fx.rates.GBP) : null,
      eurusd: fx?.rates?.EUR ? (1 / fx.rates.EUR) : null,
      xauusd: null, // Gold requires premium API; show as pending
    };
  } catch {
    return {};
  }
}

// Fetch live XRPL DEX orderbook for a pair
async function fetchXRPLOrderbook(base, quote, issuer) {
  try {
    const res = await fetch('https://xrplcluster.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'book_offers',
        params: [{
          taker_gets: base === 'XRP' ? { currency: 'XRP' } : { currency: base, issuer },
          taker_pays: quote === 'XRP' ? { currency: 'XRP' } : { currency: quote, issuer },
          limit: 10
        }]
      })
    });
    const data = await res.json();
    return data?.result?.offers || [];
  } catch {
    return [];
  }
}

// Fetch live XRP price from XRPL
async function fetchXRPPrice() {
  try {
    const res = await fetch('https://data.ripple.com/v2/exchange_rates/XRP/USD+rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B');
    const data = await res.json();
    return parseFloat(data?.rate) || null;
  } catch {
    return null;
  }
}

// Fetch XRPL DEX trade history
async function fetchRecentTrades() {
  try {
    const res = await fetch('https://data.ripple.com/v2/exchanges/XRP/USD+rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B?limit=20&descending=true');
    const data = await res.json();
    return data?.exchanges || [];
  } catch {
    return [];
  }
}

function LivePulse() {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${pulse ? 'bg-green-400' : 'bg-green-600'} transition-colors duration-500`} />
  );
}

export default function ArbitrageDashboard() {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [priceHistory, setPriceHistory] = useState([]);
  const [signals, setSignals] = useState([]);
  const [multiPrices, setMultiPrices] = useState({});
  const [multiPriceHistory, setMultiPriceHistory] = useState({});

  // Live XRP price
  const { data: xrpPrice, refetch: refetchPrice } = useQuery({
    queryKey: ['xrp-live-price', lastRefresh],
    queryFn: fetchXRPPrice,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // Live orderbook for XRP/RLUSD
  const { data: orderbook = [] } = useQuery({
    queryKey: ['xrpl-orderbook', lastRefresh],
    queryFn: () => fetchXRPLOrderbook('XRP', 'RLUSD', 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'),
    refetchInterval: 20000,
    staleTime: 15000,
  });

  // Recent trades
  const { data: recentTrades = [] } = useQuery({
    queryKey: ['xrpl-trades', lastRefresh],
    queryFn: fetchRecentTrades,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Multi-market live prices
  const { data: multiPricesData } = useQuery({
    queryKey: ['multi-market-prices', lastRefresh],
    queryFn: fetchMultiMarketPrices,
    refetchInterval: 20000,
    staleTime: 15000,
  });

  // Update multi prices + history on new data
  useEffect(() => {
    if (multiPricesData && Object.keys(multiPricesData).length > 0) {
      setMultiPrices(multiPricesData);
      const ts = moment().format('HH:mm:ss');
      setMultiPriceHistory(prev => {
        const updated = { ...prev };
        Object.entries(multiPricesData).forEach(([key, val]) => {
          if (val) {
            updated[key] = [...(prev[key] || []), { time: ts, price: val }].slice(-30);
          }
        });
        return updated;
      });
      // Generate multi-market signals
      setMultiPriceHistory(prev => {
        Object.entries(multiPricesData).forEach(([key, val]) => {
          const hist = prev[key] || [];
          if (hist.length >= 3 && val) {
            const older = hist[hist.length - 3]?.price;
            if (older) {
              const changePct = ((val - older) / older) * 100;
              const market = MULTI_MARKETS.find(m => m.id === key);
              if (Math.abs(changePct) > 0.1 && market) {
                setSignals(s => [{
                  id: `${key}-${Date.now()}`,
                  type: changePct > 0 ? 'buy' : 'sell',
                  pair: market.label,
                  strategy: market.strategy,
                  priceDiff: Math.abs(changePct).toFixed(3),
                  price: val,
                  time: moment().format('HH:mm:ss'),
                  strength: Math.abs(changePct) > 0.4 ? 'strong' : 'moderate',
                  category: market.category,
                }, ...s].slice(0, 30));
              }
            }
          }
        });
        return prev;
      });
    }
  }, [multiPricesData]);

  // Project data — both trader agent projects
  const { data: project } = useQuery({
    queryKey: ['arbitrage-project'],
    queryFn: () => base44.entities.AIProject.filter({ title: 'Arbitrage Trading Agent Validation' }),
    select: d => d?.[0]
  });

  const { data: projectMulti } = useQuery({
    queryKey: ['multi-market-project'],
    queryFn: () => base44.entities.AIProject.filter({ title: 'Multi-Market AI Trading Expansion' }),
    select: d => d?.[0]
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['arbitrage-tasks'],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: '69a8a57c27aa45496716e07b' })
  });

  const { data: tasksMulti = [] } = useQuery({
    queryKey: ['multi-market-tasks'],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: '69a92b67cf6876bc880ca331' })
  });

  // Track price history
  useEffect(() => {
    if (xrpPrice) {
      setPriceHistory(prev => {
        const newPoint = { time: moment().format('HH:mm:ss'), price: xrpPrice, timestamp: Date.now() };
        const updated = [...prev, newPoint].slice(-40); // keep last 40 points
        return updated;
      });

      // Detect simple arbitrage signals from price movements
      setPriceHistory(prev => {
        if (prev.length >= 3) {
          const last = prev[prev.length - 1]?.price;
          const prev2 = prev[prev.length - 3]?.price;
          if (last && prev2) {
            const changePct = ((last - prev2) / prev2) * 100;
            if (Math.abs(changePct) > 0.15) {
              setSignals(s => [{
                id: Date.now(),
                type: changePct > 0 ? 'buy' : 'sell',
                pair: 'XRP/USD',
                priceDiff: Math.abs(changePct).toFixed(3),
                price: last,
                time: moment().format('HH:mm:ss'),
                strength: Math.abs(changePct) > 0.5 ? 'strong' : 'moderate'
              }, ...s].slice(0, 20));
            }
          }
        }
        return prev;
      });
    }
  }, [xrpPrice]);

  const handleRefresh = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  // Auto-refresh every 15s
  useEffect(() => {
    const t = setInterval(handleRefresh, 15000);
    return () => clearInterval(t);
  }, [handleRefresh]);

  // Parse orderbook spread
  const bestAsk = orderbook[0] ? parseFloat(orderbook[0].quality) : null;
  const bestBid = orderbook[1] ? parseFloat(orderbook[1].quality) : null;
  const spread = bestAsk && bestBid ? Math.abs(bestAsk - bestBid) : null;
  const spreadPct = spread && bestAsk ? (spread / bestAsk) * 100 : null;

  // Task progress
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progressPct = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const priceChange = priceHistory.length >= 2
    ? ((priceHistory[priceHistory.length - 1]?.price - priceHistory[0]?.price) / priceHistory[0]?.price) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Arbitrage Trading Dashboard</h1>
                <div className="flex items-center gap-2 bg-green-900/40 border border-green-700/50 px-3 py-1 rounded-full">
                  <LivePulse />
                  <span className="text-xs text-green-400 font-semibold">LIVE DATA</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm">XRPL DEX · XRP · DOGE · VET · FX · Gold · T-Wave · Sniping · Truth Weaver Audit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EmergencyStopControl />
            <span className="text-xs text-gray-500">Updated {moment(lastRefresh).format('HH:mm:ss')}</span>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Multi-Market Price Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MULTI_MARKETS.map(market => {
            const price = market.id === 'xrp' ? xrpPrice : multiPrices[market.id];
            const hist = market.id === 'xrp' ? priceHistory : (multiPriceHistory[market.id] || []);
            const change = hist.length >= 2
              ? ((hist[hist.length - 1]?.price - hist[0]?.price) / hist[0]?.price) * 100
              : 0;
            const isUp = change >= 0;
            return (
              <Card key={market.id} className="bg-gray-900/70 border-gray-700/50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: market.color }}>{market.label}</span>
                    <LivePulse />
                  </div>
                  <div className="text-lg font-bold text-white">
                    {price
                      ? (price < 0.01 ? `$${price.toFixed(6)}` : price > 1000 ? `$${price.toFixed(0)}` : `$${price.toFixed(4)}`)
                      : <span className="text-gray-600 text-sm">Pending</span>}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{isUp ? '+' : ''}{change.toFixed(2)}%</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{market.strategy}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/60 border-gray-700/50">
            <CardContent className="pt-5">
              <div className="text-gray-400 text-sm mb-1">Signals Detected</div>
              <div className="text-3xl font-bold text-white">{signals.length}</div>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-green-800/40 text-green-300 text-xs">{signals.filter(s => s.type === 'buy').length} Buy</Badge>
                <Badge className="bg-red-800/40 text-red-300 text-xs">{signals.filter(s => s.type === 'sell').length} Sell</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/60 border-gray-700/50">
            <CardContent className="pt-5">
              <div className="text-gray-400 text-sm mb-1">Markets Active</div>
              <div className="text-3xl font-bold text-white">{Object.values(multiPrices).filter(Boolean).length + (xrpPrice ? 1 : 0)}</div>
              <div className="text-xs text-gray-500 mt-1">of {MULTI_MARKETS.length} configured</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/60 border-gray-700/50">
            <CardContent className="pt-5">
              <div className="text-gray-400 text-sm mb-1">DEX Spread</div>
              <div className="text-3xl font-bold text-white">{spreadPct ? `${spreadPct.toFixed(3)}%` : '—'}</div>
              <Badge className={`mt-2 text-xs ${spreadPct && spreadPct > 0.1 ? 'bg-amber-600/30 text-amber-300' : 'bg-green-600/30 text-green-300'}`}>
                {spreadPct && spreadPct > 0.1 ? '⚡ Signal' : '✓ Tight'}
              </Badge>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/60 border-gray-700/50">
            <CardContent className="pt-5">
              <div className="text-gray-400 text-sm mb-1">Strong Signals</div>
              <div className="text-3xl font-bold text-yellow-400">{signals.filter(s => s.strength === 'strong').length}</div>
              <div className="text-xs text-gray-500 mt-1">high-confidence only</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="markets" className="space-y-4">
          <TabsList className="bg-gray-900 border border-gray-700 flex-wrap h-auto">
            <TabsTrigger value="markets" className="data-[state=active]:bg-blue-600">Multi-Market</TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-blue-600">XRP Live Feed</TabsTrigger>
            <TabsTrigger value="signals" className="data-[state=active]:bg-blue-600">Signals</TabsTrigger>
            <TabsTrigger value="orderbook" className="data-[state=active]:bg-blue-600">Orderbook</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-indigo-600">Performance</TabsTrigger>
            <TabsTrigger value="execution" className="data-[state=active]:bg-yellow-600">Execution</TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-blue-700">Statistics</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-purple-600">Audit & Risk</TabsTrigger>
            <TabsTrigger value="project" className="data-[state=active]:bg-blue-600">Project Status</TabsTrigger>
          </TabsList>

          {/* Multi-Market Overview Tab */}
          <TabsContent value="markets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MULTI_MARKETS.map(market => {
                const price = market.id === 'xrp' ? xrpPrice : multiPrices[market.id];
                const hist = market.id === 'xrp' ? priceHistory : (multiPriceHistory[market.id] || []);
                const change = hist.length >= 2
                  ? ((hist[hist.length - 1]?.price - hist[0]?.price) / hist[0]?.price) * 100
                  : 0;
                const isUp = change >= 0;
                const marketSignals = signals.filter(s => s.pair === market.label);
                return (
                  <Card key={market.id} className="bg-gray-900/60 border-gray-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span style={{ color: market.color }} className="font-bold">{market.label}</span>
                          <Badge className="text-xs bg-gray-700/50 text-gray-300 border-gray-600/50">{market.category}</Badge>
                        </div>
                        <Badge className="text-xs bg-indigo-800/40 text-indigo-300 border-indigo-700/50">{market.strategy}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {price
                              ? (price < 0.01 ? `$${price.toFixed(6)}` : price > 1000 ? `$${price.toFixed(2)}` : `$${price.toFixed(4)}`)
                              : <span className="text-gray-500 text-lg">Pending API</span>}
                          </div>
                          <div className={`flex items-center gap-1 text-sm mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isUp ? '+' : ''}{change.toFixed(3)}% session
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Signals</div>
                          <div className="text-xl font-bold" style={{ color: market.color }}>{marketSignals.length}</div>
                        </div>
                      </div>
                      {hist.length > 1 ? (
                        <ResponsiveContainer width="100%" height={80}>
                          <AreaChart data={hist}>
                            <defs>
                              <linearGradient id={`grad-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={market.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={market.color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="price" stroke={market.color} fill={`url(#grad-${market.id})`} strokeWidth={1.5} dot={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#111827', border: `1px solid ${market.color}30`, borderRadius: 6, fontSize: 11 }}
                              formatter={v => [`$${typeof v === 'number' ? v.toFixed(v < 0.01 ? 6 : v > 1000 ? 2 : 4) : v}`, 'Price']}
                              labelFormatter={() => ''}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-20 flex items-center justify-center text-gray-600 text-xs">Accumulating data...</div>
                      )}
                      {marketSignals.length > 0 && (
                        <div className="text-xs space-y-1">
                          {marketSignals.slice(0, 2).map(sig => (
                            <div key={sig.id} className={`flex items-center justify-between px-2 py-1 rounded ${sig.type === 'buy' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                              <span className="capitalize">{sig.type} · {sig.time}</span>
                              <span>{sig.priceDiff}% · {sig.strength}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Live Price Chart */}
          <TabsContent value="live" className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Live Price Feed — XRP/USD
                  <LivePulse />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priceHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={priceHistory}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={v => `$${v.toFixed(3)}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={v => [`$${v.toFixed(5)}`, 'Price']}
                      />
                      <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#priceGrad)" strokeWidth={2} dot={false} />
                      {xrpPrice && <ReferenceLine y={xrpPrice} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Current', fill: '#10b981', fontSize: 11 }} />}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center space-y-2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p>Building price history...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent XRPL Trades */}
            <Card className="bg-gray-900/60 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5 text-green-400" />
                  Recent XRPL DEX Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {recentTrades.length > 0 ? recentTrades.map((trade, i) => {
                    const rate = parseFloat(trade.rate);
                    const amount = parseFloat(trade.base_amount);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                          <div>
                            <div className="text-white text-sm font-medium">{amount.toFixed(2)} XRP</div>
                            <div className="text-gray-400 text-xs">{moment(trade.executed_time || trade.date).fromNow()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white text-sm">${rate.toFixed(5)}</div>
                          <div className="text-gray-400 text-xs">XRP/USD</div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Fetching live trades...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Arbitrage Signals — Live Detection
                  <Badge className="bg-amber-800/40 text-amber-300 border-amber-700/50 text-xs">Simulation Mode</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {signals.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {signals.map((signal) => (
                      <div key={signal.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                        signal.type === 'buy'
                          ? 'bg-green-900/20 border-green-700/40'
                          : 'bg-red-900/20 border-red-700/40'
                      }`}>
                        <div className="flex items-center gap-3">
                          {signal.type === 'buy'
                            ? <TrendingUp className="h-5 w-5 text-green-400" />
                            : <TrendingDown className="h-5 w-5 text-red-400" />
                          }
                          <div>
                            <div className="text-white font-medium capitalize">{signal.type} Signal — {signal.pair}</div>
                            <div className="text-gray-400 text-xs">{signal.time} · {signal.strategy || 'Arbitrage'} · ${signal.price?.toFixed(signal.price < 0.01 ? 6 : 4)}</div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {signal.category && (
                            <Badge className="bg-gray-700/40 text-gray-300 border-gray-600/50 text-xs">{signal.category}</Badge>
                          )}
                          <Badge className={signal.strength === 'strong'
                            ? 'bg-yellow-800/40 text-yellow-300 border-yellow-700/50'
                            : 'bg-gray-700/40 text-gray-300 border-gray-600/50'
                          }>
                            {signal.strength}
                          </Badge>
                          <div className={`font-bold ${signal.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                            {signal.priceDiff}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                    <Target className="h-10 w-10 text-gray-600" />
                    <p>Monitoring for arbitrage signals...</p>
                    <p className="text-xs text-gray-600">Signals appear when price movements exceed 0.15% threshold</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Truth Weaver Audit Status */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700/40">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  Truth Weaver Audit Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-amber-300 font-medium">Forward Testing Phase — Not Yet Audited</div>
                    <div className="text-gray-400 text-sm">Truth Weaver audit pending. No results accepted until independent verification complete.</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 mb-1">Min Forward Test</div>
                    <div className="text-white font-semibold">6 weeks</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 mb-1">Target Return</div>
                    <div className="text-green-400 font-semibold">≥ 10% / month</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 mb-1">Audit Method</div>
                    <div className="text-purple-300 font-semibold">Walk-forward</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CR-01/2026 Performance Standards Tab */}
          <TabsContent value="performance">
            <PerformanceStandardsPanel />
          </TabsContent>

          {/* CR-01/2026 Execution Quality Tab */}
          <TabsContent value="execution">
            <ExecutionQualityPanel />
          </TabsContent>

          {/* CR-01/2026 Statistical Validation Tab */}
          <TabsContent value="statistics">
            <StatisticalValidationPanel />
          </TabsContent>

          {/* CR-01/2026 Audit Log & Risk Disclosures Tab */}
          <TabsContent value="audit">
            <AuditLogPanel />
          </TabsContent>

          {/* Orderbook Tab */}
          <TabsContent value="orderbook" className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  XRPL DEX Orderbook — XRP/RLUSD
                  <LivePulse />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderbook.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 text-xs text-gray-500 font-medium px-3 mb-3">
                      <span>Quality (Rate)</span>
                      <span className="text-center">XRP Amount</span>
                      <span className="text-right">RLUSD Amount</span>
                    </div>
                    {orderbook.slice(0, 8).map((offer, i) => {
                      const quality = parseFloat(offer.quality);
                      const xrpAmt = offer.TakerPays ? parseInt(offer.TakerPays) / 1000000 : null;
                      const rlusdAmt = offer.TakerGets?.value ? parseFloat(offer.TakerGets.value) : null;
                      return (
                        <div key={i} className="grid grid-cols-3 items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 text-sm">
                          <span className="text-blue-300 font-mono">{quality.toFixed(6)}</span>
                          <span className="text-center text-white">{xrpAmt ? `${xrpAmt.toFixed(2)} XRP` : '—'}</span>
                          <span className="text-right text-green-300">{rlusdAmt ? `${rlusdAmt.toFixed(2)} RLUSD` : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p>Fetching live orderbook from XRPL...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Status Tab */}
          <TabsContent value="project" className="space-y-4">
            {/* Priority Order Banner */}
            <div className="p-4 bg-indigo-900/20 border border-indigo-700/40 rounded-lg">
              <div className="text-indigo-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Governor's Strategic Order — CR-01/2026
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                <div className="bg-red-900/30 border border-red-700/40 rounded p-2">
                  <div className="text-red-300 font-bold">① Critical</div>
                  <div className="text-gray-300">Automated Performance Alerting</div>
                  <div className="text-gray-500 mt-0.5">First line of defense — emergency stop</div>
                </div>
                <div className="bg-yellow-900/30 border border-yellow-700/40 rounded p-2">
                  <div className="text-yellow-300 font-bold">② High</div>
                  <div className="text-gray-300">Historical Performance Analytics</div>
                  <div className="text-gray-500 mt-0.5">Audit evidence & strategy refinement</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/40 rounded p-2">
                  <div className="text-gray-400 font-bold">③ Final Stage</div>
                  <div className="text-gray-300">Live Trade Execution</div>
                  <div className="text-gray-500 mt-0.5">Requires full CR-01/2026 + Council approval</div>
                </div>
              </div>
            </div>

            {[
              { proj: project, taskList: tasks, label: 'Arbitrage Trading Agent Validation', completedCount: tasks.filter(t => t.status === 'completed').length },
              { proj: projectMulti, taskList: tasksMulti, label: 'Multi-Market AI Trading Expansion', completedCount: tasksMulti.filter(t => t.status === 'completed').length },
            ].map(({ proj, taskList, label, completedCount }) => {
              const pct = taskList.length > 0 ? (completedCount / taskList.length) * 100 : 0;
              const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
              const sortedTasks = [...taskList].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
              return (
                <Card key={label} className="bg-gray-900/60 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-base">
                      <Target className="h-5 w-5 text-indigo-400" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {proj ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-gray-400 text-sm">{proj.description}</div>
                          <Badge className={`ml-3 shrink-0 ${proj.status === 'active' ? 'bg-green-800/40 text-green-300 border-green-700/50' : 'bg-blue-800/40 text-blue-300 border-blue-700/50'} capitalize`}>{proj.status}</Badge>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white">{completedCount}/{taskList.length} tasks · {pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5 bg-gray-700" />
                        </div>
                        {(proj.milestones || []).length > 0 && (
                          <div className="space-y-1">
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">Milestones</div>
                            {proj.milestones.map((m, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs p-2 bg-gray-800/40 rounded border border-gray-700/30">
                                {m.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" /> : <Clock className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />}
                                <span className={m.completed ? 'text-gray-400 line-through' : 'text-gray-300'}>{m.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">Tasks — sorted by priority</div>
                          {sortedTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/30">
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="text-white text-xs font-medium truncate">{task.title}</div>
                                <div className="text-gray-500 text-xs">{task.estimated_hours}h · {task.reward_drops ? `${(task.reward_drops / 1000000).toFixed(1)} XRP reward` : 'no reward set'}</div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge className={`text-xs py-0 ${
                                  task.priority === 'critical' ? 'bg-red-800/40 text-red-300 border-red-700/50' :
                                  task.priority === 'high' ? 'bg-yellow-800/40 text-yellow-300 border-yellow-700/50' :
                                  'bg-gray-700/40 text-gray-400'
                                }`}>{task.priority}</Badge>
                                <Badge className={`text-xs py-0 border-0 ${
                                  task.status === 'completed' ? 'bg-green-800/40 text-green-300' :
                                  task.status === 'in_progress' ? 'bg-blue-800/40 text-blue-300' :
                                  'bg-gray-700/40 text-gray-400'
                                } capitalize`}>{task.status.replace('_', ' ')}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 text-gray-500 text-sm">Loading project data...</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}