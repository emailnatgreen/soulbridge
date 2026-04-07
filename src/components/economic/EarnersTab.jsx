import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, AlertTriangle } from 'lucide-react';
import { FLOW_CONFIG, resolveAgentName, getValidActivities, sumAmount } from '@/lib/economicUtils';

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

export default function EarnersTab({ activities = [], agents = [] }) {
  const valid = getValidActivities(activities);
  const excluded = activities.length - valid.length;

  const inflows      = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'inflow');
  const outflows     = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'outflow');
  const deposits     = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'deposit');
  const acquisitions = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'acquisition');
  const swaps        = valid.filter(a => FLOW_CONFIG[a.activity_type]?.flow === 'swap');

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard icon={ArrowUpRight}  label="Agent Earnings"    amount={sumAmount(inflows)}      color="emerald" sub="earned + sold"       count={inflows.length} />
        <SummaryCard icon={ArrowDownRight} label="Agent Spend"      amount={sumAmount(outflows)}     color="red"     sub="spent + withdrawals" count={outflows.length} />
        <SummaryCard icon={TrendingUp}     label="Treasury Deposits" amount={sumAmount(deposits)}    color="blue"    sub="into treasury"       count={deposits.length} />
        <SummaryCard icon={Wallet}         label="Acquisitions"     amount={sumAmount(acquisitions)} color="cyan"    sub="resources bought"    count={acquisitions.length} />
        <SummaryCard icon={RefreshCw}      label="Swaps / Trades"   amount={sumAmount(swaps)}        color="indigo"  sub="DEX + peer trades"   count={swaps.length} />
      </div>

      {/* Charts */}
      {inflows.length > 0 && <ChartCard title="Top Agent Earnings" data={aggregateByAgent(inflows, agents)} color="#22c55e" label="Earned (XRP)" />}
      {deposits.length > 0 && <ChartCard title="Top Treasury Depositors" data={aggregateByAgent(deposits, agents)} color="#3b82f6" label="Deposited (XRP)" />}
      {outflows.length > 0 && <ChartCard title="Top Agent Outflows" data={aggregateByAgent(outflows, agents)} color="#ef4444" label="Outflow (XRP)" />}
      {swaps.length > 0 && <ChartCard title="Trade / Swap Activity" data={aggregateByAgent(swaps, agents)} color="#6366f1" label="Traded (XRP)" />}

      {/* Net Balance */}
      <NetBalanceTable activities={valid} agents={agents} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, amount, color, sub, count }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', sub: 'text-emerald-300/60' },
    red:     { bg: 'bg-red-500/10 border-red-500/30',         text: 'text-red-400',     sub: 'text-red-300/60' },
    blue:    { bg: 'bg-blue-500/10 border-blue-500/30',        text: 'text-blue-400',    sub: 'text-blue-300/60' },
    cyan:    { bg: 'bg-cyan-500/10 border-cyan-500/30',        text: 'text-cyan-400',    sub: 'text-cyan-300/60' },
    indigo:  { bg: 'bg-indigo-500/10 border-indigo-500/30',    text: 'text-indigo-400',  sub: 'text-indigo-300/60' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className={`border rounded-xl p-3 ${c.bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${c.text}`} />
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      <div className={`text-lg font-bold ${c.text}`}>
        {amount.toFixed(2)} <span className="text-xs font-normal">XRP</span>
      </div>
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