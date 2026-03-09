import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, TrendingUp, TrendingDown, Eye, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';

const SIGNAL_COLORS = {
  buy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  sell: 'bg-red-500/20 text-red-400 border-red-500/30',
  hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  watch: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STRENGTH_COLORS = {
  weak: 'text-gray-400',
  moderate: 'text-yellow-400',
  strong: 'text-orange-400',
  very_strong: 'text-red-400',
};

const SENTIMENT_ICONS = {
  very_bullish: '🚀',
  bullish: '📈',
  neutral: '➡️',
  bearish: '📉',
  very_bearish: '💀',
};

const VOLATILITY_COLORS = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  extreme: 'text-red-400',
};

function SignalCard({ signal }) {
  const [expanded, setExpanded] = useState(false);
  const isUp = signal.signal_type === 'buy';
  const isDown = signal.signal_type === 'sell';

  return (
    <div className={`border rounded-lg p-3 bg-gray-900/60 ${isUp ? 'border-emerald-500/30' : isDown ? 'border-red-500/30' : 'border-gray-700'} transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{signal.symbol}</span>
          <Badge className={`text-xs border ${SIGNAL_COLORS[signal.signal_type] || 'bg-gray-700 text-gray-300'}`}>
            {isUp ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : isDown ? <TrendingDown className="w-3 h-3 mr-1 inline" /> : <Eye className="w-3 h-3 mr-1 inline" />}
            {signal.signal_type?.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{signal.confidence_score?.toFixed(0)}% conf.</span>
          <span className="text-lg" title={signal.sentiment}>{SENTIMENT_ICONS[signal.sentiment] || '➡️'}</span>
        </div>
      </div>

      {/* Price info */}
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div>
          <p className="text-gray-500">Entry</p>
          <p className="text-white font-mono">${signal.entry_price?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
        </div>
        <div>
          <p className="text-emerald-500">Target</p>
          <p className="text-emerald-400 font-mono">${signal.target_price?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
        </div>
        <div>
          <p className="text-red-500">Stop</p>
          <p className="text-red-400 font-mono">${signal.stop_loss?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <div className="flex items-center gap-2">
          <span className={STRENGTH_COLORS[signal.strength]}>{signal.strength?.replace('_', ' ')}</span>
          <span>·</span>
          <span className={VOLATILITY_COLORS[signal.volatility_level]}>{signal.volatility_level} vol</span>
          {signal.risk_reward_ratio && (
            <>
              <span>·</span>
              <span className="text-purple-400">R:R {signal.risk_reward_ratio}</span>
            </>
          )}
        </div>
        <span className="text-gray-600 capitalize">{signal.timeframe}</span>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less' : 'Reasoning'}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-800 space-y-2">
          {signal.reasoning && (
            <p className="text-xs text-gray-400 leading-relaxed">{signal.reasoning}</p>
          )}
          {signal.key_indicators?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {signal.key_indicators.map((ind, i) => (
                <span key={i} className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full">{ind}</span>
              ))}
            </div>
          )}
          {signal.news_catalysts?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {signal.news_catalysts.map((cat, i) => (
                <span key={i} className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">⚡ {cat}</span>
              ))}
            </div>
          )}
          {signal.expires_at && (
            <p className="text-xs text-gray-600">Expires {formatDistanceToNow(parseISO(signal.expires_at), { addSuffix: true })}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SignalsPanel() {
  const queryClient = useQueryClient();

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['signals-active'],
    queryFn: () => base44.entities.Signal.filter({ status: 'active' }, '-created_date', 20),
    refetchInterval: 60000,
  });

  const runAnalysisMutation = useMutation({
    mutationFn: () => base44.functions.invoke('analyzeMarketSignals', {}),
    onSuccess: (res) => {
      const count = res.data?.signals_created || 0;
      toast.success(`Analysis complete — ${count} new signal${count !== 1 ? 's' : ''} generated`);
      queryClient.invalidateQueries({ queryKey: ['signals-active'] });
    },
    onError: () => toast.error('Signal analysis failed'),
  });

  const buys = signals.filter(s => s.signal_type === 'buy');
  const sells = signals.filter(s => s.signal_type === 'sell');
  const watches = signals.filter(s => ['hold', 'watch'].includes(s.signal_type));

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">AI Signals</span>
          {signals.length > 0 && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full">
              {signals.length} active
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => runAnalysisMutation.mutate()}
          disabled={runAnalysisMutation.isPending}
          className="text-xs text-gray-400 hover:text-white h-7 px-2"
        >
          {runAnalysisMutation.isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RefreshCw className="w-3 h-3" />
          }
          <span className="ml-1">{runAnalysisMutation.isPending ? 'Analyzing...' : 'Run'}</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">No active signals</p>
            <p className="text-gray-600 text-xs mt-1">Click Run to analyze the market</p>
          </div>
        ) : (
          <>
            {buys.length > 0 && (
              <div>
                <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider mb-2">
                  Long ({buys.length})
                </p>
                {buys.map(s => <div key={s.id} className="mb-2"><SignalCard signal={s} /></div>)}
              </div>
            )}
            {sells.length > 0 && (
              <div>
                <p className="text-xs text-red-500 font-semibold uppercase tracking-wider mb-2">
                  Short ({sells.length})
                </p>
                {sells.map(s => <div key={s.id} className="mb-2"><SignalCard signal={s} /></div>)}
              </div>
            )}
            {watches.length > 0 && (
              <div>
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-2">
                  Watch ({watches.length})
                </p>
                {watches.map(s => <div key={s.id} className="mb-2"><SignalCard signal={s} /></div>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}