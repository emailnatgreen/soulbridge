import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, AlertTriangle } from 'lucide-react';

const FLOW_CONFIG = {
  earned:              { flow: 'inflow',  label: 'Earned' },
  resource_sold:       { flow: 'inflow',  label: 'Resource Sold' },
  spent:               { flow: 'outflow', label: 'Spent' },
  treasury_withdrawal: { flow: 'outflow', label: 'Treasury Withdrawal' },
  treasury_deposit:    { flow: 'deposit', label: 'Treasury Deposit' },
  resource_acquired:   { flow: 'acquisition', label: 'Resource Acquired' },
  traded:              { flow: 'swap',    label: 'Traded / Swapped' },
};

function isRealisticAmount(a) {
  if (a.transaction_hash?.startsWith('TASK_') && a.amount > 1000) return false;
  if (a.amount > 10000 && !/^[A-Fa-f0-9]{64}$/.test(a.transaction_hash || '')) return false;
  return true;
}

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
  if (agentId === 'dex_swap') return 'DEX Swap Engine';
  if (agentId === 'rAXI' || agentId === 'axi_main_001') return 'Axi';
  if (agentId.startsWith('r') && agentId.length > 20) return `${agentId.slice(0, 6)}…${agentId.slice(-4)}`;
  return agentId.length > 12 ? `${agentId.slice(0, 10)}…` : agentId;
}

function aggregateByAgent(items, agents) {
  const map = {};
  items.forEach(a => {
    const name = resolveAgentName(a.agent_id, agents);
    map[name] = (map[name] || 0) + (a.amount ?? 0);
  });
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }));
}

function SummaryCard({ icon: Icon, label, amount, color, sub, count }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', sub: 'text-emerald-300/60' },
    red:     { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', sub: 'text-red-300/60' },
    blue:    { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', sub: 'text-blue-300/60' },
    cyan:    { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-400', sub: 'text-cyan-300/60' },
    indigo:  { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400', sub: 'text-indigo-300/60' },
  };
  const c = colorMap[color] || colorMap.emerald;
  return (
    <div className={`border rounded-xl p-3 ${c.bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${c.text}`} />
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      <div className={`text-lg font-bold ${c.text}`}>{amount.toFixed(2)} <span className="text-xs font-normal">XRP</span></div>
      <div className={`text-[10px] ${c.sub} mt-0.5`}>{count} entries · {sub}</div>
    </div>
  );
}

function ChartCard({ title, data, color, label }) {
  if (data.length === 0) return null;
  return (
    <Card className="bg-slate-900/60 border-slate-700/40">
      <CardHeader><CardTitle className="text-white text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v) => [`${v} XRP`, label]} />
            <Bar dataKey="amount" fill={color} radius={[0, 4, 4, 0]} name={label} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function NetBalanceTable({ activities, agents }) {
  const balanceMap = {};
  activities.forEach(a => {
    const name = resolveAgentName(a.agent_id, agents);
    if (!balanceMap[name]) balanceMap[name] = { in: 0, out: 0 };
    const flow = FLOW_CONFIG[a.activity_type]?.flow;
    if (flow === 'inflow') balanceMap[name].in += a.amount ?? 0;
    if (flow === 'outflow' || flow === 'acquisition') balanceMap[name].out += a.amount ?? 0;
  });
  const rows = Object.entries(balanceMap)
    .map(([name, { in: inAmt, out: outAmt }]) => ({ name, in: inAmt, out: outAmt, net: inAmt - outAmt }))
    .filter(r => r.in > 0 || r.out > 0)
    .sort((a, b) => b.net - a.net);
  if (rows.length === 0) return null;
  return (
    <Card className="bg-slate-900/60 border-slate-700/40">
      <CardHeader><CardTitle className="text-white text-sm">Net Agent Balance (Earnings − Spend)</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {rows.map(r => (
            <div key={r.name} className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg text-xs">
              <span className="text-slate-300 truncate max-w-[140px]">{r.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-emerald-400">+{r.in.toFixed(2)}</span>
                <span className="text-red-400">−{r.out.toFixed(2)}</span>
                <span className={`font-semibold min-w-[70px] text-right ${r.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {r.net >= 0 ? '+' : ''}{r.net.toFixed(2)} XRP
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EarnersTab({ activities = [], agents = [] }) {
  const valid = activities.filter(a => a.status === 'completed' && isRealisticAmount(a));
  const excluded = activities.length - valid.length;

  const inflows = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'inflow');
  const outflows = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'outflow');
  const deposits = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'deposit');
  const acquisitions = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'acquisition');
  const swaps = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'swap');

  const sumAmount = (arr) => arr.reduce((s, a) => s + (a.amount ?? 0), 0);
  const totalInflow = sumAmount(inflows);
  const totalOutflow = sumAmount(outflows);
  const totalDeposits = sumAmount(deposits);
  const totalAcquisitions = sumAmount(acquisitions);
  const totalSwaps = sumAmount(swaps);

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
      {excluded > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300">
            {excluded} simulated/pending entries excluded — only completed, verified activities shown.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard icon={ArrowUpRight} label="Agent Earnings" amount={totalInflow} color="emerald" sub="earned + sold" count={inflows.length} />
        <SummaryCard icon={ArrowDownRight} label="Agent Spend" amount={totalOutflow} color="red" sub="spent + withdrawals" count={outflows.length} />
        <SummaryCard icon={TrendingUp} label="Treasury Deposits" amount={totalDeposits} color="blue" sub="into treasury" count={deposits.length} />
        <SummaryCard icon={Wallet} label="Acquisitions" amount={totalAcquisitions} color="cyan" sub="resources bought" count={acquisitions.length} />
        <SummaryCard icon={RefreshCw} label="Swaps / Trades" amount={totalSwaps} color="indigo" sub="DEX + peer trades" count={swaps.length} />
      </div>

      {inflows.length > 0 && <ChartCard title="Top Agent Earnings" data={aggregateByAgent(inflows, agents)} color="#22c55e" label="Earned (XRP)" />}
      {deposits.length > 0 && <ChartCard title="Top Treasury Depositors" data={aggregateByAgent(deposits, agents)} color="#3b82f6" label="Deposited (XRP)" />}
      {outflows.length > 0 && <ChartCard title="Top Agent Outflows" data={aggregateByAgent(outflows, agents)} color="#ef4444" label="Outflow (XRP)" />}
      {swaps.length > 0 && <ChartCard title="Trade / Swap Activity" data={aggregateByAgent(swaps, agents)} color="#6366f1" label="Traded (XRP)" />}

      <NetBalanceTable activities={valid} agents={agents} />
    </div>
  );
}