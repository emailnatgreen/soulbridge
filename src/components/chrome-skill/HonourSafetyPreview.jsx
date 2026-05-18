import React from 'react';
import { Heart, Shield, Loader2, AlertTriangle } from 'lucide-react';

function ScoreBar({ value, color }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }}
      />
    </div>
  );
}

function SignalList({ signals }) {
  if (!signals || signals.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {signals.slice(0, 3).map((s, i) => (
        <li key={i} className="text-[10px] text-slate-500 leading-tight">• {s}</li>
      ))}
    </ul>
  );
}

export default function HonourSafetyPreview({ preview, previewLoading, harnessResult }) {
  // After creation, show the final harness scores; before, show live preview
  const showFinal = harnessResult?.honour_score != null;

  const honour = showFinal ? harnessResult.honour_score : preview.honour;
  const safety = showFinal ? harnessResult.safety_score : preview.safety;
  const honourSignals = showFinal ? [] : (preview.honour_signals || []);
  const safetySignals = showFinal ? [] : (preview.safety_signals || []);
  const riskFlag = showFinal ? null : preview.risk_flag;

  const hasScores = honour != null;
  const isLive = !showFinal && hasScores;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Honour */}
      <div className={`rounded-xl border p-4 transition-colors duration-300 ${
        hasScores
          ? honour >= 70 ? 'border-pink-500/30 bg-pink-500/5' : honour >= 40 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'
          : 'border-slate-700/40 bg-slate-900/40'
      }`}>
        <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-pink-400" />
          Honour
          {isLive && <span className="ml-auto text-[9px] font-normal text-pink-400/60 uppercase tracking-wider">Live</span>}
          {showFinal && <span className="ml-auto text-[9px] font-normal text-pink-400/60 uppercase tracking-wider">Final</span>}
          {previewLoading && !showFinal && <Loader2 className="ml-auto w-3 h-3 text-slate-500 animate-spin" />}
        </h3>

        {hasScores ? (
          <div>
            <p className={`text-2xl font-bold transition-all duration-500 ${
              honour >= 70 ? 'text-pink-300' : honour >= 40 ? 'text-amber-300' : 'text-red-300'
            }`}>{honour}%</p>
            <ScoreBar value={honour} color={honour >= 70 ? 'bg-pink-400' : honour >= 40 ? 'bg-amber-400' : 'bg-red-400'} />
            {showFinal && (
              <p className="text-[10px] text-slate-500 mt-1.5">
                Sincerity: {harnessResult.sincerity_before} → {harnessResult.sincerity_after}
                {harnessResult.sincerity_delta > 0 ? ` (+${harnessResult.sincerity_delta})` : harnessResult.sincerity_delta < 0 ? ` (${harnessResult.sincerity_delta})` : ''}
              </p>
            )}
            <SignalList signals={honourSignals} />
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            {previewLoading ? 'Analysing…' : 'Start typing to see score.'}
          </p>
        )}
      </div>

      {/* Safety */}
      <div className={`rounded-xl border p-4 transition-colors duration-300 ${
        hasScores
          ? safety >= 70 ? 'border-emerald-500/30 bg-emerald-500/5' : safety >= 40 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'
          : 'border-slate-700/40 bg-slate-900/40'
      }`}>
        <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Safety
          {isLive && <span className="ml-auto text-[9px] font-normal text-emerald-400/60 uppercase tracking-wider">Live</span>}
          {showFinal && <span className="ml-auto text-[9px] font-normal text-emerald-400/60 uppercase tracking-wider">Final</span>}
          {previewLoading && !showFinal && <Loader2 className="ml-auto w-3 h-3 text-slate-500 animate-spin" />}
        </h3>

        {hasScores ? (
          <div>
            <p className={`text-2xl font-bold transition-all duration-500 ${
              safety >= 70 ? 'text-emerald-300' : safety >= 40 ? 'text-amber-300' : 'text-red-300'
            }`}>{safety}%</p>
            <ScoreBar value={safety} color={safety >= 70 ? 'bg-emerald-400' : safety >= 40 ? 'bg-amber-400' : 'bg-red-400'} />
            {showFinal && (
              <p className="text-[10px] text-slate-500 mt-1.5">
                Pipeline: {harnessResult.pipeline_result}
                {harnessResult.shield_status === 'anomaly_logged' && ' · ⚠ Anomaly flagged'}
              </p>
            )}
            <SignalList signals={safetySignals} />
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            {previewLoading ? 'Analysing…' : 'Start typing to see score.'}
          </p>
        )}
      </div>

      {/* Risk Flag */}
      {riskFlag && (
        <div className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300/80">{riskFlag}</p>
        </div>
      )}
    </div>
  );
}