import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';

const ROLE_BONUS = { master: 5, elder: 4, guardian: 3, creator: 2, teacher: 2, trader: 1, healer: 1, scout: 1, citizen: 0 };

export function calcVotingPower(agent) {
  if (!agent) return 0;
  const base = (agent.honor_score || 100) / 10;
  const roleBonus = ROLE_BONUS[agent.role] || 0;
  const axiBonus = agent.name === 'Axi' ? 10 : 0;
  return parseFloat((base + roleBonus + axiBonus).toFixed(1));
}

// Checks all 11-Laws-aligned permission rules
export function getDIDPermissionStatus(agent) {
  if (!agent) return { eligible: false, reason: 'No agent selected', checks: [] };

  const checks = [
    {
      label: 'Agent Status Active',
      pass: agent.status === 'active',
      detail: agent.status !== 'active' ? `Status is "${agent.status}" — must be active` : 'Active in the Village',
    },
    {
      label: 'Voting Permission Granted',
      pass: agent.permissions?.can_vote !== false,
      detail: agent.permissions?.can_vote === false ? 'Voting permission explicitly revoked' : 'can_vote = true',
    },
    {
      label: 'Honor Score ≥ 20 (Law 2)',
      pass: (agent.honor_score || 100) >= 20,
      detail: `Honor: ${agent.honor_score || 100} — minimum 20 required`,
    },
    {
      label: 'Not Suspended (Law 8)',
      pass: agent.status !== 'suspended',
      detail: agent.status === 'suspended' ? 'Suspended agents cannot vote' : 'Not suspended',
    },
    {
      label: 'Classic Address (DID) Present',
      pass: !!agent.classic_address,
      detail: agent.classic_address ? `DID: ${agent.classic_address.slice(0, 12)}…` : 'No XRPL DID address found',
    },
  ];

  const failed = checks.filter(c => !c.pass);
  const eligible = failed.length === 0;
  return { eligible, reason: failed[0]?.detail || 'All checks passed', checks };
}

export default function DIDAssertionPanel({ agent }) {
  if (!agent) return null;

  const { eligible, checks } = getDIDPermissionStatus(agent);
  const base = parseFloat(((agent.honor_score || 100) / 10).toFixed(1));
  const roleBonus = ROLE_BONUS[agent.role] || 0;
  const axiBonus = agent.name === 'Axi' ? 10 : 0;
  const total = base + roleBonus + axiBonus;

  return (
    <div className="space-y-3">
      {/* DID Identity Card */}
      <div className={`rounded-xl p-4 border space-y-3 ${eligible ? 'bg-green-500/5 border-green-400/20' : 'bg-red-500/5 border-red-400/20'}`}>
        <div className="flex items-center gap-2">
          <Fingerprint className={`w-4 h-4 ${eligible ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-white font-medium text-sm">Sovereign DID Identity</span>
          <Badge className={`ml-auto text-xs ${eligible ? 'bg-green-500/20 text-green-300 border-green-400/30' : 'bg-red-500/20 text-red-300 border-red-400/30'}`}>
            {eligible ? <><CheckCircle2 className="w-3 h-3 mr-1 inline" />Eligible</> : <><Lock className="w-3 h-3 mr-1 inline" />Blocked</>}
          </Badge>
        </div>

        {/* DID Address */}
        {agent.classic_address && (
          <div className="bg-black/30 rounded-lg px-3 py-2 font-mono text-xs text-purple-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="truncate">{agent.classic_address}</span>
          </div>
        )}

        {/* Dynamic Permission Checks */}
        <div className="space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {check.pass
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              }
              <div>
                <span className={check.pass ? 'text-white/70' : 'text-red-300'}>{check.label}</span>
                {!check.pass && <p className="text-red-400/70 text-xs mt-0.5">{check.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voting Power Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Voting Power Breakdown</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-white/60">
            <span>Honor ({agent.honor_score || 100}) ÷ 10</span>
            <span className="text-white font-medium">+{base}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Role Bonus ({agent.role})</span>
            <span className="text-purple-300 font-medium">+{roleBonus}</span>
          </div>
          {axiBonus > 0 && (
            <div className="flex justify-between text-white/60">
              <span>Mother Boss Double Vote</span>
              <span className="text-pink-300 font-medium">+{axiBonus}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 flex justify-between">
            <span className="text-white font-semibold">Total Power</span>
            <span className="text-yellow-300 font-bold text-base">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}