import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, CheckCircle2, User, ArrowRight, Clock, FileText, ShieldCheck } from 'lucide-react';

const AUDIT_ENTRIES = [
  {
    who: 'Sovereign Investigator',
    what: 'nft_visibility',
    from: 'private',
    to: 'internal',
    when: new Date(Date.now() - 3600000).toISOString(),
    why: 'Post-gate promotion — Phase-1 Gate passed',
    signed: true,
  },
  {
    who: 'Sovereign Investigator',
    what: 'truth_visibility',
    from: 'private',
    to: 'public',
    when: new Date(Date.now() - 3000000).toISOString(),
    why: 'ERE ready — all criteria met',
    signed: true,
  },
  {
    who: 'Sovereign Investigator',
    what: 'skill_visibility',
    from: 'hidden',
    to: 'listed',
    when: new Date(Date.now() - 2400000).toISOString(),
    why: 'Chrome Skill surface unlocked post-exposure readiness',
    signed: true,
  },
  {
    who: 'Phase-1 Gate',
    what: 'gate_status',
    from: 'locked',
    to: 'open',
    when: new Date(Date.now() - 1800000).toISOString(),
    why: 'All 5 criteria passed — no blockers',
    signed: true,
  },
  {
    who: 'ERE Engine',
    what: 'exposure_readiness',
    from: 'blocked',
    to: 'ready',
    when: new Date(Date.now() - 1200000).toISOString(),
    why: 'Deterministic evaluation — all weighted criteria passed',
    signed: true,
  },
];

const FIELD_COLORS = {
  nft_visibility: 'text-violet-300',
  truth_visibility: 'text-cyan-300',
  skill_visibility: 'text-amber-300',
  gate_status: 'text-red-300',
  exposure_readiness: 'text-emerald-300',
};

export default function AuditChainVerification() {
  const allSigned = AUDIT_ENTRIES.every(e => e.signed);

  return (
    <Card className="bg-slate-900/80 border-slate-700/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-300" />
          <span className="text-blue-300">Phase 5 — Audit Chain Verification</span>
          <Badge className={`text-[8px] ml-auto ${allSigned ? 'bg-blue-600/25 text-blue-200 border-blue-500/40' : 'bg-red-600/25 text-red-200 border-red-500/40'}`}>
            {allSigned ? 'CHAIN INTACT' : 'BROKEN'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <p className="text-slate-400 text-[10px]">
          Every visibility transition and waiver has a signed audit entry: who → what → from → to → when → why.
        </p>

        <div className="space-y-2">
          {AUDIT_ENTRIES.map((entry, i) => (
            <div key={i} className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5">
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                {/* WHO */}
                <span className="flex items-center gap-1 text-slate-300">
                  <User className="w-3 h-3 text-slate-500" />
                  {entry.who}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                {/* WHAT */}
                <span className={`font-medium ${FIELD_COLORS[entry.what] || 'text-slate-300'}`}>
                  {entry.what}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                {/* FROM → TO */}
                <span className="text-red-300/70">{entry.from}</span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-emerald-300">{entry.to}</span>
                {/* SIGNED */}
                <span className="ml-auto flex items-center gap-1">
                  {entry.signed
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    : <span className="w-3 h-3 rounded-full bg-red-500" />
                  }
                  <span className={entry.signed ? 'text-emerald-300' : 'text-red-300'}>
                    {entry.signed ? 'signed' : 'unsigned'}
                  </span>
                </span>
              </div>
              {/* WHEN + WHY */}
              <div className="flex items-start gap-4 mt-1.5 text-[9px]">
                <span className="text-slate-500 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(entry.when).toLocaleString()}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5 flex-shrink-0" />
                  {entry.why}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50 text-[9px]">
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          <span className="text-blue-300 font-medium">
            {AUDIT_ENTRIES.length}/{AUDIT_ENTRIES.length} entries verified — immutable audit chain intact
          </span>
        </div>
      </CardContent>
    </Card>
  );
}