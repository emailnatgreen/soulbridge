import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, X, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DIM_LABEL = {
  empathy: 'Empathy',
  clarity: 'Clarity',
  problem_solving: 'Problem Solving',
  de_escalation: 'De-escalation',
  brand_voice: 'Brand Voice',
  context_integration: 'Context Integration',
};

const LEVEL_STYLE = {
  strength:   { bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500',  text: 'text-green-800' },
  caution:    { bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-500',  text: 'text-amber-800' },
  suggestion: { bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500',   text: 'text-blue-800'  },
};

const LEVEL_ICON = {
  strength:   '✓',
  caution:    '⚠',
  suggestion: '→',
};

export default function RealTimeCoach({ draftText, reviewId, weakDimensions }) {
  const [tips, setTips] = useState([]);
  const [overallVibe, setOverallVibe] = useState('');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastCoached, setLastCoached] = useState('');
  const debounceRef = useRef(null);

  const fetchCoaching = useCallback(async (text) => {
    if (text === lastCoached) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('coachDraftResponse', {
        ghost_review_id: reviewId,
        draft_text: text,
        weak_dimensions: weakDimensions || [],
      });
      if (res.data.reason === 'draft_too_short') return;
      setTips(res.data.tips || []);
      setOverallVibe(res.data.overall_vibe || '');
      setLastCoached(text);
      setDismissed(false);
      setCollapsed(false);
    } catch (_) {
      // silently fail — coaching is advisory
    } finally {
      setLoading(false);
    }
  }, [reviewId, weakDimensions, lastCoached]);

  useEffect(() => {
    if (!draftText || draftText.trim().length < 30) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCoaching(draftText.trim()), 1600);
    return () => clearTimeout(debounceRef.current);
  }, [draftText, fetchCoaching]);

  if (dismissed || (!loading && tips.length === 0)) return null;

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-100">
        <div className="flex items-center gap-2">
          {loading
            ? <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          }
          <span className="text-xs font-semibold text-purple-700">Live Coaching</span>
          {loading && <span className="text-xs text-purple-400">Analysing your draft…</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(p => !p)}
            className="p-1 rounded hover:bg-purple-100 text-purple-400 hover:text-purple-600 transition-colors"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-purple-100 text-purple-400 hover:text-purple-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && !loading && tips.length > 0 && (
        <div className="p-3 space-y-2">
          {overallVibe && (
            <p className="text-xs text-purple-600 italic flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" />
              {overallVibe}
            </p>
          )}
          <div className="space-y-1.5">
            {tips.map((tip, i) => {
              const style = LEVEL_STYLE[tip.level] || LEVEL_STYLE.suggestion;
              return (
                <div key={i} className={`rounded-lg border px-3 py-2 flex gap-2 items-start ${style.bg}`}>
                  <span className={`shrink-0 text-xs font-bold mt-0.5 ${style.text}`}>
                    {LEVEL_ICON[tip.level]}
                  </span>
                  <div>
                    <span className={`text-xs font-semibold ${style.text} mr-1`}>
                      {DIM_LABEL[tip.dimension] || tip.dimension}:
                    </span>
                    <span className={`text-xs ${style.text} opacity-90`}>{tip.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}