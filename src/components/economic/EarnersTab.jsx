import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUpRight, Wallet } from 'lucide-react';

const INFLOW_TYPES = ['earned', 'resource_sold', 'treasury_deposit', 'resource_acquired'];
const OUTFLOW_TYPES = ['spent', 'traded', 'treasury_withdrawal'];

function resolveAgentName(agentId, agents) {
  if (!agentId) return 'Unknown';
  const byId = agents.find(a => a.id === agentId);
  if (byId) return byId.name;
  const byAddress = agents.find(a => a.classic_address === agentId);
  if (byAddress) return byAddress.name;
  const byWallet = agents.find(a => a.wallet_id === agentId);
  if (byWallet) return byWallet.name;
  const byExternal = agents.find(a => a.external_classic_addresses?.includes(agentId));
  if (byExternal) return byExternal.name;
  // Friendly fallback for known system IDs
  if (agentId === 'dex_swap') return 'DEX Swap Engine';
  if (agentId === 'rAXI' || agentId.toLowerCase().includes('axi')) return 'Axi';
  if (agentId.startsWith('r') && agentId.length > 20) return `${agentId.slice(0, 6)}…${agentId.slice(-4)}`;
  return agentId.length > 12 ? `${agentId.slice(0, 10)}…` : agentId;
}

export default function EarnersTab({ activities = [], agents = [] }) {
  // Aggregate inflows per agent
  const inflowMap = {};
  const outflowMap = {};

  activities.forEach(a => {
    const name = resolveAgentName(a.agent_id, agents);
    if (INFLOW_TYPES.includes(a.activity_type)) {
      inflowMap[name] = (inflowMap[name] || 0) + (a.amount ?? 0);
    }
    if (OUTFLOW_TYPES.includes(a.activity_type)) {
      outflowMap[name] = (outflowMap[name] || 0) + (a.amount ?? 0);
    }
  });

  const topInflows = Object.entries(inflowMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }));

  const topOutflows = Object.entries(outflowMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }));

  // Summary
  const totalInflow = Object.values(inflowMap).reduce((s, v) => s + v, 0);
  const totalOutflow = Object.values(outflowMap).reduce((s, v) => s + v, 0);

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No economic activity recorded yet.</p>
        <p className="text-slate-600 text-xs mt-1">Activities appear when agents trade, earn, or interact with the treasury.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300">Total Inflows</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">{totalInflow.toFixed(2)} XRP</div>
          <div className="text-[10px] text-emerald-300/60 mt-0.5">earned + deposits + acquired + sold</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-300">Total Outflows</span>
          </div>
          <div className="text-xl font-bold text-blue-400">{totalOutflow.toFixed(2)} XRP</div>
          <div className="text-[10px] text-blue-300/60 mt-0.5">spent + traded + withdrawals</div>
        </div>
      </div>

      {/* Inflow Chart */}
      {topInflows.length > 0 && (
        <Card className="bg-slate-900/60 border-slate-700/40">
          <CardHeader><CardTitle className="text-white text-sm">Top Inflows by Agent</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topInflows} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v) => [`${v} XRP`, 'Inflow']} />
                <Bar dataKey="amount" fill="#22c55e" radius={[0, 4, 4, 0]} name="Inflow (XRP)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Outflow Chart */}
      {topOutflows.length > 0 && (
        <Card className="bg-slate-900/60 border-slate-700/40">
          <CardHeader><CardTitle className="text-white text-sm">Top Outflows by Agent</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topOutflows} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v) => [`${v} XRP`, 'Outflow']} />
                <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} name="Outflow (XRP)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}