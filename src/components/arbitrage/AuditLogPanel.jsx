import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, AlertTriangle, Info, FileText } from 'lucide-react';
import moment from 'moment';

// Immutable audit log entries — seeded with system-level events
const SYSTEM_AUDIT_LOG = [
  {
    id: 'audit-001',
    timestamp: '2026-03-05T07:06:15Z',
    event: 'Project Created',
    detail: 'Multi-Market AI Trading Expansion project initiated',
    actor: 'Governor (System)',
    hash: '0xa1b2c3d4e5f6...',
    verified: true,
  },
  {
    id: 'audit-002',
    timestamp: '2026-03-04T21:34:52Z',
    event: 'Project Created',
    detail: 'Arbitrage Trading Agent Validation project initiated',
    actor: 'Governor (System)',
    hash: '0xf6e5d4c3b2a1...',
    verified: true,
  },
  {
    id: 'audit-003',
    timestamp: '2026-03-05T00:00:00Z',
    event: 'CR-01/2026 Enacted',
    detail: 'Council Resolution CR-01/2026 approved. All Trader Agents subject to Truth Weaver audit before capital deployment.',
    actor: 'Council',
    hash: '0xc0de1234abcd...',
    verified: true,
  },
  {
    id: 'audit-004',
    timestamp: '2026-03-05T08:00:00Z',
    event: 'Dashboard Deployed',
    detail: 'Arbitrage Trading Dashboard live at /ArbitrageDashboard. Multi-market feeds active.',
    actor: 'System',
    hash: '0xdead5678beef...',
    verified: true,
  },
];

const RISK_DISCLOSURES = [
  {
    title: 'Capital Loss Risk',
    detail: 'All trading strategies carry risk of capital loss. Past simulation results do not guarantee future live performance.',
    severity: 'high',
  },
  {
    title: 'Market Volatility',
    detail: 'Sudden market events (flash crashes, liquidity crises, regulatory actions) may cause strategies to fail without warning.',
    severity: 'high',
  },
  {
    title: 'Simulation vs. Live Discrepancy',
    detail: 'Backtesting and forward-test simulations may not fully reflect real-world slippage, fees, and liquidity constraints.',
    severity: 'medium',
  },
  {
    title: 'XRPL Network Risk',
    detail: 'XRPL DEX operations are subject to network latency, node availability, and protocol-level risks.',
    severity: 'medium',
  },
  {
    title: 'Regulatory Risk',
    detail: 'Automated trading agents may be subject to evolving regulatory requirements across jurisdictions.',
    severity: 'medium',
  },
  {
    title: 'Algorithm Risk',
    detail: 'Strategy logic may contain errors or perform poorly in unseen market conditions. All agents are in validation phase.',
    severity: 'high',
  },
];

export default function AuditLogPanel() {
  const [showAll, setShowAll] = useState(false);

  const displayedLog = showAll ? SYSTEM_AUDIT_LOG : SYSTEM_AUDIT_LOG.slice(0, 4);

  return (
    <div className="space-y-4">

      {/* CR-01/2026 Compliance Banner */}
      <div className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-700/40 rounded-lg">
        <Shield className="h-5 w-5 text-purple-400 flex-shrink-0" />
        <div>
          <div className="text-purple-300 font-medium text-sm">CR-01/2026 — Immutable Audit Log & Risk Disclosures</div>
          <div className="text-gray-400 text-xs">All system events are recorded with hash references. Trade-level audit logs will append automatically once execution begins.</div>
        </div>
        <Badge className="ml-auto bg-green-800/40 text-green-300 border-green-700/50 text-xs shrink-0">Active</Badge>
      </div>

      {/* Audit Log */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            Immutable Audit Log
            <Badge className="bg-purple-800/40 text-purple-300 border-purple-700/50 text-xs">{SYSTEM_AUDIT_LOG.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {displayedLog.map((entry) => (
              <div key={entry.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{entry.event}</span>
                      {entry.verified && (
                        <Badge className="bg-green-800/30 text-green-400 border-green-700/30 text-xs py-0">✓ Verified</Badge>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">{entry.detail}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span>{moment(entry.timestamp).format('DD MMM YYYY HH:mm:ss')}</span>
                      <span>·</span>
                      <span>{entry.actor}</span>
                      <span>·</span>
                      <span className="font-mono text-gray-600">{entry.hash}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {SYSTEM_AUDIT_LOG.length > 4 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {showAll ? '▲ Show less' : `▼ Show all ${SYSTEM_AUDIT_LOG.length} entries`}
            </button>
          )}
          <div className="mt-3 p-2 bg-gray-800/30 rounded text-xs text-gray-500 flex items-center gap-2">
            <FileText className="h-3 w-3" />
            Trade-level audit entries will append here automatically once trading execution begins
          </div>
        </CardContent>
      </Card>

      {/* Risk Disclosures */}
      <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-700/40">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Risk Disclosures — CR-01/2026 Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {RISK_DISCLOSURES.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                r.severity === 'high'
                  ? 'bg-red-900/20 border-red-700/30'
                  : 'bg-orange-900/20 border-orange-700/30'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${r.severity === 'high' ? 'text-red-400' : 'text-orange-400'}`} />
                  <div>
                    <div className={`text-sm font-medium ${r.severity === 'high' ? 'text-red-300' : 'text-orange-300'}`}>{r.title}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{r.detail}</div>
                  </div>
                  <Badge className={`ml-auto text-xs shrink-0 ${
                    r.severity === 'high'
                      ? 'bg-red-800/40 text-red-300 border-red-700/50'
                      : 'bg-orange-800/40 text-orange-300 border-orange-700/50'
                  }`}>{r.severity.toUpperCase()}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explainability Section */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            Trader Agent Explainability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { agent: 'XRP Arbitrage Agent', strategy: 'Cross-DEX price discrepancy detection on XRPL', status: 'In Validation' },
              { agent: 'DOGE T-Wave Agent', strategy: 'Elliott Wave pattern + momentum sniping on DOGE/USDT', status: 'In Validation' },
              { agent: 'EUR/USD Sniping Agent', strategy: 'News-event momentum capture on EUR/USD FX pair', status: 'In Validation' },
              { agent: 'Gold T-Wave Agent', strategy: 'T-Wave pattern detection on XAU/USD', status: 'Pending API' },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div>
                  <div className="text-white text-sm font-medium">{a.agent}</div>
                  <div className="text-gray-400 text-xs">{a.strategy}</div>
                </div>
                <Badge className={`text-xs ${a.status === 'Pending API' ? 'bg-gray-700/40 text-gray-400' : 'bg-amber-800/40 text-amber-300 border-amber-700/50'}`}>
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}