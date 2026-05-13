import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, Lock, Shield, FileText, Sparkles, Info, Clock } from 'lucide-react';
import { VISIBILITY_DEFAULTS, NFT_LEVELS, TRUTH_LEVELS, SKILL_LEVELS, requiresPhaseGate } from '@/lib/visibilityGovernance';
import { getReadinessBadgeState } from '@/lib/exposureReadinessEngine';
import { getGateBadgeState } from '@/lib/phase1CompletionGate';
import VisibilityConfirmDialog from './VisibilityConfirmDialog';
import VisibilityWaiverDialog from './VisibilityWaiverDialog';

const SWITCH_CONFIG = [
  { field: 'nft_visibility', label: 'NFT Visibility', icon: Shield, levels: NFT_LEVELS, publicValue: 'public' },
  { field: 'truth_visibility', label: 'Truth Engine Output', icon: FileText, levels: TRUTH_LEVELS, publicValue: 'public' },
  { field: 'skill_visibility', label: 'Chrome Skill / Surface', icon: Sparkles, levels: SKILL_LEVELS, publicValue: 'listed' },
];

const LEVEL_STYLES = {
  private: 'text-white/40', internal: 'text-amber-400', public: 'text-emerald-400',
  hidden: 'text-white/40', unlisted: 'text-amber-400', listed: 'text-emerald-400',
};

export default function VisibilityGovernancePanel({ investigation, buildOrder, phase1Gate, exposureReadiness, onVisibilityChange, onWaiversChange, auditLog = [] }) {
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [waiverDialog, setWaiverDialog] = useState(false);
  const [localWaivers, setLocalWaivers] = useState([]);

  const visibility = useMemo(() => ({
    nft_visibility: investigation?.nft_visibility || VISIBILITY_DEFAULTS.nft_visibility,
    truth_visibility: investigation?.truth_visibility || VISIBILITY_DEFAULTS.truth_visibility,
    skill_visibility: investigation?.skill_visibility || VISIBILITY_DEFAULTS.skill_visibility,
  }), [investigation]);

  // Phase-1 Gate is the hard lock — it must be open (or overridden) for public
  const gateState = getGateBadgeState(phase1Gate);
  const gateClosed = gateState === 'closed';

  // ERE-aware: public is blocked if ERE says not ready (unless only waiver-required)
  const ereState = getReadinessBadgeState(exposureReadiness);
  const ereBlocked = ereState === 'blocked';

  // Combined blocker reason for tooltips
  const combinedBlockReason = gateClosed
    ? `Phase-1 Gate locked — ${phase1Gate?.blocking_items?.length || 0} blockers`
    : ereBlocked
      ? 'ERE: not ready for exposure'
      : null;

  const handleChange = (field, newValue) => {
    const needsGate = requiresPhaseGate(field, newValue);
    if (needsGate && (gateClosed || ereBlocked)) {
      // Block — hard gate or ERE says no
      return;
    }
    if (needsGate) {
      // Requires confirm dialog
      setConfirmDialog({ field, newValue });
    } else {
      // Non-public change — just do it (still logged on backend)
      onVisibilityChange(field, newValue, '');
    }
  };

  const handleConfirm = (reason) => {
    if (confirmDialog) {
      onVisibilityChange(confirmDialog.field, confirmDialog.newValue, reason);
    }
    setConfirmDialog(null);
  };

  const handleWaivers = (waivers) => {
    const updated = [...localWaivers, ...waivers];
    setLocalWaivers(updated);
    if (onWaiversChange) onWaiversChange(updated);
    setWaiverDialog(false);
  };

  const isPublicValue = (field, value) => {
    const cfg = SWITCH_CONFIG.find(s => s.field === field);
    return cfg && value === cfg.publicValue;
  };

  return (
    <TooltipProvider>
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-violet-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Visibility Governance
            <Badge className="text-[7px] bg-violet-500/10 text-violet-300/60 border-violet-500/20 ml-1">PHASE-GATED</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Gate status — Phase-1 Gate + ERE combined */}
          <div className={`rounded-lg border p-2.5 text-[10px] flex items-center gap-2 ${(!gateClosed && !ereBlocked) ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
            {(!gateClosed && !ereBlocked) ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>
              {gateClosed
                ? `Phase-1 Gate locked — ${phase1Gate?.blocking_items?.length || 0} blockers`
                : ereBlocked
                  ? 'ERE: not ready for exposure'
                  : 'Gate open · ERE clear — public exposure permitted'}
            </span>
            {gateState === 'overridden' && (
              <Badge className="text-[7px] bg-amber-500/15 text-amber-300 border-amber-500/25 ml-auto">{phase1Gate?.waiver_log?.length || 0} waived</Badge>
            )}
            {gateClosed && (phase1Gate?.blocking_items?.length || 0) > 0 && (
              <Button data-waiver-trigger onClick={() => setWaiverDialog(true)} variant="ghost" size="sm" className="text-red-400 text-[9px] h-5 px-2 ml-auto hover:text-red-300">
                Waive Blockers
              </Button>
            )}
          </div>

          {/* Three independent switches */}
          <div className="space-y-2">
            {SWITCH_CONFIG.map(cfg => {
              const Icon = cfg.icon;
              const currentValue = visibility[cfg.field];
              const publicBlocked = gateClosed || ereBlocked;

              return (
                <div key={cfg.field} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <Icon className={`w-3.5 h-3.5 ${LEVEL_STYLES[currentValue]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-[10px] font-medium">{cfg.label}</p>
                  </div>
                  <Select
                    value={currentValue}
                    onValueChange={(val) => handleChange(cfg.field, val)}
                  >
                    <SelectTrigger className="w-28 h-7 bg-white/[0.03] border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      {cfg.levels.map(level => {
                        const isPublic = level === cfg.publicValue;
                        const disabled = isPublic && publicBlocked;
                        return (
                          <Tooltip key={level}>
                            <TooltipTrigger asChild>
                              <div>
                                <SelectItem
                                  value={level}
                                  disabled={disabled}
                                  className={`text-xs ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${LEVEL_STYLES[level]}`}
                                >
                                  {level}
                                  {disabled && <Lock className="w-2.5 h-2.5 inline ml-1" />}
                                </SelectItem>
                              </div>
                            </TooltipTrigger>
                            {disabled && (
                              <TooltipContent side="left" className="bg-slate-900 border-white/10 text-[10px] text-red-300 max-w-48">
                                {combinedBlockReason || 'Public exposure blocked'}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          {/* Audit trail (last 5) */}
          {auditLog.length > 0 && (
            <div className="border-t border-white/5 pt-2 space-y-1">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Audit Trail
              </p>
              {auditLog.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px] text-white/30">
                  <span className="text-white/15 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                  <span className="text-white/50">{entry.who}</span>
                  <span>{entry.field}: <span className={LEVEL_STYLES[entry.from_state]}>{entry.from_state}</span> → <span className={LEVEL_STYLES[entry.to_state]}>{entry.to_state}</span></span>
                  {entry.reason && <span className="text-white/20 truncate max-w-32" title={entry.reason}>"{entry.reason}"</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <VisibilityConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleConfirm}
        field={confirmDialog?.field || ''}
        newValue={confirmDialog?.newValue || ''}
        investigation={investigation}
        buildOrder={buildOrder}
      />

      {/* Waiver dialog */}
      <VisibilityWaiverDialog
        open={waiverDialog}
        onClose={() => setWaiverDialog(false)}
        onWaive={handleWaivers}
        blockers={phase1Gate?.blocking_items || []}
      />
    </TooltipProvider>
  );
}