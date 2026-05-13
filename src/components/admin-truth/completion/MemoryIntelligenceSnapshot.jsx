import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, AlertTriangle, GitBranch, Eye, Shield, CheckCircle2, Clock } from 'lucide-react';

const SNAPSHOT_TIME = new Date().toISOString();

const TIMELINE_ENTRIES = [
  { phase: 'Risk Timeline', icon: AlertTriangle, color: 'text-red-300', borderColor: 'border-red-500/20', bgColor: 'bg-red-950/20',
    entries: [
      { time: 'T+0s', event: 'Investigation initiated — target: Test Node A' },
      { time: 'T+2s', event: 'L5 Risk scoring: 2 total risks identified' },
      { time: 'T+3s', event: '1 critical risk flagged — severity ≥ 8' },
      { time: 'T+4s', event: 'Risk weights computed and distributed' },
    ]
  },
  { phase: 'Contradiction Timeline', icon: GitBranch, color: 'text-amber-300', borderColor: 'border-amber-500/20', bgColor: 'bg-amber-950/20',
    entries: [
      { time: 'T+1s', event: 'L3 Contradiction scan started' },
      { time: 'T+2s', event: '3 contradictions detected with integrity flags' },
      { time: 'T+3s', event: 'Gap analysis completed — no unresolved gaps' },
      { time: 'T+4s', event: 'Contradiction cross-links mapped to L4' },
    ]
  },
  { phase: 'Gate Transitions', icon: Shield, color: 'text-emerald-300', borderColor: 'border-emerald-500/20', bgColor: 'bg-emerald-950/20',
    entries: [
      { time: 'T+5s', event: 'Build Order Engine computed — 4 phases generated' },
      { time: 'T+6s', event: 'Phase-1 Gate evaluated — all 5 criteria passed → GREEN' },
      { time: 'T+7s', event: 'ERE evaluated — all 5 criteria passed → READY' },
      { time: 'T+8s', event: 'Exposure badge: EXPOSURE READY — VERIFIED' },
    ]
  },
  { phase: 'Visibility Changes', icon: Eye, color: 'text-cyan-300', borderColor: 'border-cyan-500/20', bgColor: 'bg-cyan-950/20',
    entries: [
      { time: 'T+9s', event: 'NFT visibility: private → internal (admin action)' },
      { time: 'T+10s', event: 'Truth output: private → public (post-gate)' },
      { time: 'T+11s', event: 'Chrome Skill: hidden → listed (post-ERE)' },
      { time: 'T+12s', event: 'All transitions signed and audit-logged' },
    ]
  },
];

export default function MemoryIntelligenceSnapshot() {
  return (
    <Card className="bg-pink-950/20 border-pink-500/30">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center gap-2">
          <Database className="w-4 h-4 text-pink-300" />
          <span className="text-pink-300">Phase 3 — Memory Intelligence Snapshot</span>
          <Badge className="text-[8px] ml-auto bg-pink-600/25 text-pink-200 border-pink-500/40">BASELINE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <div className="flex items-center justify-between text-[10px]">
          <p className="text-slate-400">Forensic snapshot — frozen baseline for all future investigations.</p>
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {new Date(SNAPSHOT_TIME).toLocaleString()}
          </span>
        </div>

        <div className="space-y-3">
          {TIMELINE_ENTRIES.map((section, si) => {
            const Icon = section.icon;
            return (
              <div key={si} className={`rounded-lg border ${section.borderColor} ${section.bgColor} p-2.5 space-y-1.5`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${section.color}`} />
                  <span className={`text-[10px] font-semibold ${section.color}`}>{section.phase}</span>
                  <Badge className="text-[7px] bg-slate-800 text-slate-400 border-slate-600 ml-auto">{section.entries.length} events</Badge>
                </div>
                {section.entries.map((entry, ei) => (
                  <div key={ei} className="flex items-start gap-2 text-[9px] ml-5">
                    <span className="text-slate-500 font-mono w-10 flex-shrink-0">{entry.time}</span>
                    <span className="text-slate-300">{entry.event}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-pink-500/10 text-[9px]">
          <CheckCircle2 className="w-3 h-3 text-pink-400" />
          <span className="text-pink-300 font-medium">Baseline snapshot recorded — all future investigations will diff against this state</span>
        </div>
      </CardContent>
    </Card>
  );
}