import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Copy, ExternalLink, Heart, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

function AnimatedScore({ target, color, label, icon: Icon }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target == null) return;
    let frame;
    const start = performance.now();
    const duration = 800;
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/60 border border-slate-700/40 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{current}%</span>
    </div>
  );
}

export function SuccessModal({ harnessResult, onClose }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const skillId = harnessResult?.skill_id || harnessResult?.harness_run_id || '—';
  const honour = harnessResult?.honour_score ?? 0;
  const safety = harnessResult?.safety_score ?? 0;
  const pipelineResult = harnessResult?.pipeline_result || 'PASS';

  const handleCopyId = () => {
    navigator.clipboard.writeText(skillId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500/20 via-purple-500/10 to-pink-500/10 px-6 pt-6 pb-4 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Skill Created</h2>
          <p className="text-xs text-slate-400 mt-1">Your Chrome Skill is live in the ecosystem</p>
        </div>

        {/* Scores */}
        <div className="px-6 py-4 space-y-2.5">
          <AnimatedScore target={honour} color="text-pink-400" label="Honour" icon={Heart} />
          <AnimatedScore target={safety} color="text-emerald-400" label="Safety" icon={Shield} />
        </div>

        {/* Skill ID */}
        <div className="mx-6 rounded-lg bg-slate-800/40 border border-slate-700/30 px-3 py-2.5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Skill ID</p>
            <p className="text-xs font-mono text-slate-300 truncate">{skillId}</p>
          </div>
          <button onClick={handleCopyId} className="text-slate-500 hover:text-slate-300 transition-colors ml-2 shrink-0">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Pipeline badge */}
        <div className="px-6 pt-3">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
              pipelineResult === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' :
              pipelineResult === 'WARN' ? 'bg-amber-500/15 text-amber-400' :
              'bg-red-500/15 text-red-400'
            }`}>{pipelineResult}</span>
            {harnessResult?.marketplace_registered && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-400">Marketplace Listed</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 space-y-2">
          <Button
            onClick={() => navigate('/sovereign-search')}
            className="w-full h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Skills
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-9 rounded-xl text-xs text-slate-400 hover:text-white"
          >
            Create Another
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ErrorModal({ harnessResult, onClose }) {
  const errorMsg = harnessResult?.error_message || harnessResult?.blocks?.join('; ') || 'Something went wrong while creating your skill.';
  const pipelineResult = harnessResult?.pipeline_result || 'ERROR';
  const guidance = harnessResult?.regeneration_guidance || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-red-500/15 via-orange-500/10 to-slate-900 px-6 pt-6 pb-4 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Creation Failed</h2>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-red-500/15 text-red-400 mt-2 inline-block">{pipelineResult}</span>
        </div>

        {/* Error detail */}
        <div className="px-6 py-4">
          <p className="text-sm text-slate-300 leading-relaxed">{errorMsg}</p>

          {guidance.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Guidance</p>
              {guidance.slice(0, 3).map((g, i) => (
                <p key={i} className="text-xs text-amber-300/70 leading-snug">• {g}</p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <Button
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700/50"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}