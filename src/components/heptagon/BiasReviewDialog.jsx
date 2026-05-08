import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

const DECISION_STYLES = {
  approved: { label: 'Approve Correction', icon: CheckCircle2, color: 'text-green-400', border: 'border-green-500/30' },
  dismissed: { label: 'Dismiss', icon: XCircle, color: 'text-slate-400', border: 'border-slate-500/30' },
  needs_info: { label: 'Request More Info', icon: HelpCircle, color: 'text-blue-400', border: 'border-blue-500/30' },
};

export default function BiasReviewDialog({ report, decision, onConfirm, onCancel, submitting }) {
  const [notes, setNotes] = useState('');
  const style = DECISION_STYLES[decision] || DECISION_STYLES.approved;
  const Icon = style.icon;

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${style.border} border bg-white/5 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${style.color}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{style.label}</h3>
            <p className="text-white/40 text-xs">{report.bias_type?.replace(/_/g, ' ')} — {report.severity}</p>
          </div>
        </div>

        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-white/60 text-xs">{report.description}</p>
        </div>

        <div>
          <label className="text-white/50 text-xs block mb-1.5">
            Review Notes <span className="text-red-400">*</span> (mandatory)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain your reasoning…"
            className="w-full rounded-lg bg-black/30 border border-white/10 text-white text-sm p-3 h-24 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-white/50 hover:text-white text-xs h-9">
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(notes)}
            disabled={!notes.trim() || submitting}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-9 gap-1"
          >
            {submitting ? 'Submitting…' : 'Confirm Review'}
          </Button>
        </div>
      </div>
    </div>
  );
}