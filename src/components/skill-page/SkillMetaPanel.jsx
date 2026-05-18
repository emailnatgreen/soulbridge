import React, { useState } from 'react';
import { Info, Copy, CheckCircle2 } from 'lucide-react';

function MetaRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const displayVal = value || '—';
  const canCopy = !!value;

  const handleCopy = () => {
    if (!canCopy) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-b-0 group">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono text-slate-300 truncate max-w-[200px]">{displayVal}</span>
        {canCopy && (
          <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400">
            {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SkillMetaPanel({ skill, governanceLog }) {
  const meta = governanceLog?.metadata || {};

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-slate-400" />
        Metadata
      </h3>

      <div className="space-y-0">
        <MetaRow label="Skill ID" value={skill.id} />
        <MetaRow label="Run ID" value={meta.run_id} />
        <MetaRow label="Payment Method" value={skill.payment_method} />
        <MetaRow label="Pipeline" value={meta.pipeline_result} />
        <MetaRow label="Version" value="1.0.0" />
        <MetaRow label="Sincerity Delta" value={meta.sincerity_delta != null ? String(meta.sincerity_delta) : null} />
        <MetaRow label="Processing" value={meta.processing_ms != null ? `${meta.processing_ms}ms` : null} />
        <MetaRow label="Shield" value={meta.shield_status} />
      </div>
    </div>
  );
}