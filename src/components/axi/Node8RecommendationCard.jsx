import React, { useState } from 'react';
import { Shield, AlertTriangle, Eye, Zap, Lock, Check, X, Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const ACTION_CONFIG = {
  flag: { label: 'Flag', icon: Eye, color: 'text-slate-300', bg: 'bg-slate-500/15 border-slate-500/20' },
  warn: { label: 'Warn', icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/20' },
  challenge: { label: 'Challenge', icon: Zap, color: 'text-orange-300', bg: 'bg-orange-500/15 border-orange-500/20' },
  isolate: { label: 'Isolate', icon: Lock, color: 'text-red-300', bg: 'bg-red-500/15 border-red-500/20' },
};

const SEV_COLORS = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const STATUS_BADGES = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  denied: 'bg-red-500/20 text-red-300 border-red-500/30',
  expired: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  auto_executed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export default function Node8RecommendationCard({ rec, onApprove, onDeny, onOverride, isActing, config }) {
  const [expanded, setExpanded] = useState(false);
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [denialRationale, setDenialRationale] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const actionCfg = ACTION_CONFIG[rec.action_type] || ACTION_CONFIG.flag;
  const ActionIcon = actionCfg.icon;
  const isPending = rec.status === 'pending';
  const isAutoExecuted = rec.status === 'auto_executed';
  const isExpired = rec.expires_at && new Date(rec.expires_at) < new Date() && isPending;
  const isAutoEligible = config?.auto_execute_enabled && config?.auto_execute_actions?.includes(rec.action_type) && isPending;

  const handleOverride = () => {
    if (overrideReason.trim().length < 5) return;
    onOverride(rec.id, overrideReason.trim());
    setShowOverrideForm(false);
    setOverrideReason('');
  };

  const handleDeny = () => {
    if (denialRationale.trim().length < 5) return;
    onDeny(rec.id, denialRationale.trim());
    setShowDenyForm(false);
    setDenialRationale('');
  };

  return (
    <div className={`rounded-xl border p-4 transition-all ${isPending && !isExpired ? actionCfg.bg : 'bg-white/[0.02] border-white/10'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ActionIcon className={`w-5 h-5 flex-shrink-0 ${actionCfg.color}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-semibold">{rec.recommendation_id}</span>
              <Badge className={`${SEV_COLORS[rec.severity]} text-[9px] px-1.5`}>{rec.severity}</Badge>
              <Badge className={`${STATUS_BADGES[rec.status]} text-[9px] px-1.5`}>
                {isExpired ? 'expired' : rec.status}
              </Badge>
              {isAutoEligible && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px] px-1.5">⚡ AUTO</Badge>
              )}
              {rec.auto_executed && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] px-1.5">AUTO-EXECUTED</Badge>
              )}
              {rec.escalated && (
                <Badge className="bg-red-600/20 text-red-300 border-red-600/30 text-[9px] px-1.5">ESCALATED</Badge>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{actionCfg.label} · Score: {rec.threat_score}/100</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Summary */}
      <p className="text-slate-300 text-xs mt-2 leading-relaxed">{rec.summary}</p>

      {/* Timestamps */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(new Date(rec.created_date), 'dd MMM HH:mm')}
        </span>
        {rec.expires_at && isPending && (
          <span className={isExpired ? 'text-red-400' : 'text-amber-400'}>
            {isExpired ? 'Expired' : `Expires: ${format(new Date(rec.expires_at), 'HH:mm')}`}
          </span>
        )}
        {rec.approved_at && <span className="text-emerald-400">Approved: {format(new Date(rec.approved_at), 'HH:mm')}</span>}
        {rec.denied_at && <span className="text-red-400">Denied: {format(new Date(rec.denied_at), 'HH:mm')}</span>}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {rec.rationale && (
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Node 8 Rationale:</p>
              <p className="text-xs text-slate-300 bg-white/[0.03] rounded-lg p-2">{rec.rationale}</p>
            </div>
          )}
          {rec.affected_entities?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Affected Entities:</p>
              <div className="flex flex-wrap gap-1">
                {rec.affected_entities.map((e, i) => (
                  <Badge key={i} className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px]">
                    {e.entity_type}: {e.detail || e.entity_id}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {rec.denial_rationale && (
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Denial Rationale (Correction Data):</p>
              <p className="text-xs text-red-300 bg-red-500/5 rounded-lg p-2">{rec.denial_rationale}</p>
            </div>
          )}
          {rec.execution_result && (
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Execution Result:</p>
              <pre className="text-[10px] text-emerald-300 bg-emerald-500/5 rounded-lg p-2 overflow-auto">
                {JSON.stringify(rec.execution_result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons — pending or auto-executed */}
      {isPending && !isExpired && (
        <div className="mt-3 pt-3 border-t border-white/5">
          {isAutoEligible && (
            <p className="text-cyan-400/70 text-[9px] mb-2 flex items-center gap-1">
              ⚡ Will auto-execute after {config?.override_window_minutes || 5}min if not overridden
            </p>
          )}
          {showDenyForm ? (
            <div className="space-y-2">
              <p className="text-[10px] text-red-300">Mandatory rationale (fed to Node 8 as correction data):</p>
              <Textarea
                value={denialRationale}
                onChange={(e) => setDenialRationale(e.target.value)}
                placeholder="Why is this recommendation incorrect? This improves Node 8's accuracy..."
                className="bg-slate-800/50 border-red-500/30 text-white text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleDeny}
                  disabled={denialRationale.trim().length < 5 || isActing}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 text-xs"
                  variant="outline"
                >
                  <X className="w-3 h-3 mr-1" /> Confirm Denial
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowDenyForm(false); setDenialRationale(''); }}
                  className="text-slate-400 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onApprove(rec.id)}
                disabled={isActing}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 text-xs flex-1"
                variant="outline"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Approve & Execute
              </Button>
              <Button
                size="sm"
                onClick={() => setShowDenyForm(true)}
                disabled={isActing}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 text-xs flex-1"
                variant="outline"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Deny
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Override Button — for auto-executed recs */}
      {isAutoExecuted && (
        <div className="mt-3 pt-3 border-t border-white/5">
          {showOverrideForm ? (
            <div className="space-y-2">
              <p className="text-[10px] text-orange-300">Override reason (correction data for Node 8):</p>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why should this auto-action be reversed? This improves future accuracy..."
                className="bg-slate-800/50 border-orange-500/30 text-white text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleOverride}
                  disabled={overrideReason.trim().length < 5 || isActing}
                  className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-200 border border-orange-500/30 text-xs"
                  variant="outline"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Confirm Override
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowOverrideForm(false); setOverrideReason(''); }}
                  className="text-slate-400 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowOverrideForm(true)}
              disabled={isActing}
              className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-200 border border-orange-500/30 text-xs w-full"
              variant="outline"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Override Auto-Action
            </Button>
          )}
        </div>
      )}
    </div>
  );
}