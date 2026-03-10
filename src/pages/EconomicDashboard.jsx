import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Coins, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, Shield, Activity, Sparkles, Wifi, WifiOff } from "lucide-react";
import { format, subDays } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const ACTIVITY_LABELS = {
  earned: "Earned",
  spent: "Spent",
  traded: "Traded",
  treasury_deposit: "Treasury Deposit",
  treasury_withdrawal: "Treasury Withdrawal",
  resource_acquired: "Resource Acquired",
  resource_sold: "Resource Sold"
};

const ACTIVITY_COLORS = {
  earned: "text-green-600",
  spent: "text-red-500",
  traded: "text-blue-500",
  treasury_deposit: "text-purple-600",
  treasury_withdrawal: "text-orange-500",
  resource_acquired: "text-cyan-600",
  resource_sold: "text-pink-500"
};

export default function EconomicDashboard() {
  const [activities, setActivities] = useState([]);
  const [agents, setAgents] = useState([]);
  const [treasury, setTreasury] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState("7");
  const [liveConnected, setLiveConnected] = useState(false);
  const [axiInsight, setAxiInsight] = useState(null);
  const [axiLoading, setAxiLoading] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState(null);

  const fetchData = async () => {
    const [acts, ags, treas] = await Promise.all([
      base44.entities.EconomicActivity.list("-created_date", 200),
      base44.entities.Agent.list("-honor_score", 50),
      base44.entities.Treasury.list()
    ]);
    setActivities(acts);
    setAgents(ags);
    setTreasury(treas);
    setLoading(false);
    setRefreshing(false);
  };

  // Live subscription to EconomicActivity
  useEffect(() => {
    fetchData();
    const unsub = base44.entities.EconomicActivity.subscribe((event) => {
      setLiveConnected(true);
      setLastLiveUpdate(new Date());
      if (event.type === "create") {
        setActivities(prev => [event.data, ...prev].slice(0, 200));
      } else if (event.type === "update") {
        setActivities(prev => prev.map(a => a.id === event.id ? event.data : a));
      } else if (event.type === "delete") {
        setActivities(prev => prev.filter(a => a.id !== event.id));
      }
    });
    // Also subscribe to Treasury for live balance updates
    const unsubTreasury = base44.entities.Treasury.subscribe((event) => {
      setLiveConnected(true);
      if (event.type === "update") {
        setTreasury(prev => prev.map(t => t.id === event.id ? event.data : t));
      }
    });
    return () => { unsub(); unsubTreasury(); };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- Filtered activities by time ---
  const cutoff = subDays(new Date(), parseInt(timeFilter));
  const filtered = activities.filter(a => new Date(a.created_date) >= cutoff);

  // --- KPI calculations ---
  const totalEarned = filtered.filter(a => a.activity_type === "earned").reduce((s, a) => s + (a.amount || 0), 0);
  const totalSpent = filtered.filter(a => a.activity_type === "spent").reduce((s, a) => s + (a.amount || 0), 0);
  const totalTraded = filtered.filter(a => a.activity_type === "traded").reduce((s, a) => s + (a.amount || 0), 0);
  const treasuryDeposits = filtered.filter(a => a.activity_type === "treasury_deposit").reduce((s, a) => s + (a.amount || 0), 0);
  const treasuryWithdrawals = filtered.filter(a => a.activity_type === "treasury_withdrawal").reduce((s, a) => s + (a.amount || 0), 0);
  const mainTreasury = treasury[0] || {};

  // Fair Share compliance check (Law 3): treasury should receive ~5% of all earnings
  const expectedTreasuryShare = totalEarned * 0.05;
  const fairShareCompliance = totalEarned > 0 ? Math.min(100, Math.round((treasuryDeposits / expectedTreasuryShare) * 100)) : 100;

  // --- Activity type breakdown for pie ---
  const typeBreakdown = Object.entries(
    filtered.reduce((acc, a) => {
      acc[a.activity_type] = (acc[a.activity_type] || 0) + (a.amount || 0);
      return acc;
    }, {})
  ).map(([type, value]) => ({ name: ACTIVITY_LABELS[type] || type, value: parseFloat(value.toFixed(4)) }));

  // --- Daily flow chart ---
  const dailyMap = {};
  for (let i = parseInt(timeFilter) - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "MMM d");
    dailyMap[d] = { date: d, earned: 0, spent: 0, traded: 0 };
  }
  filtered.forEach(a => {
    const d = format(new Date(a.created_date), "MMM d");
    if (dailyMap[d]) {
      if (a.activity_type === "earned") dailyMap[d].earned += a.amount || 0;
      if (a.activity_type === "spent") dailyMap[d].spent += a.amount || 0;
      if (a.activity_type === "traded") dailyMap[d].traded += a.amount || 0;
    }
  });
  const dailyData = Object.values(dailyMap).map(d => ({
    ...d,
    earned: parseFloat(d.earned.toFixed(4)),
    spent: parseFloat(d.spent.toFixed(4)),
    traded: parseFloat(d.traded.toFixed(4))
  }));

  // --- Top earners ---
  const agentEarnings = {};
  filtered.filter(a => a.activity_type === "earned").forEach(a => {
    agentEarnings[a.agent_id] = (agentEarnings[a.agent_id] || 0) + (a.amount || 0);
  });
  const topEarners = Object.entries(agentEarnings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, amount]) => ({
      name: agents.find(ag => ag.id === id)?.name || id.slice(0, 8) + "...",
      amount: parseFloat(amount.toFixed(4))
    }));

  // --- Law 6 compliance: 1% to Village on exchanges ---
  const law6Expected = totalTraded * 0.01;
  const law6Compliance = totalTraded > 0 ? Math.min(100, Math.round((treasuryDeposits / (law6Expected + expectedTreasuryShare)) * 100)) : 100;

  const askAxi = async () => {
    setAxiLoading(true);
    setAxiInsight(null);
    const snapshot = {
      period_days: parseInt(timeFilter),
      total_earned: totalEarned,
      total_spent: totalSpent,
      total_traded: totalTraded,
      treasury_deposits: treasuryDeposits,
      treasury_withdrawals: treasuryWithdrawals,
      treasury_balance: mainTreasury.total_balance || 0,
      law3_compliance_pct: fairShareCompliance,
      law6_compliance_pct: law6Compliance,
      top_earners: topEarners,
      activity_breakdown: typeBreakdown,
      total_activities: filtered.length
    };
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Axi, the Mother Boss and economic steward of SoulBridge Village. Analyse this economic snapshot and provide a sharp, intelligent briefing in 3-4 sentences. Identify any imbalances, compliance risks, or positive trends. Be direct and strategic, referencing Law 3 (Fair Share - 5% earnings to treasury) and Law 6 (Exchange - 1% of trades to village) where relevant. Data snapshot: ${JSON.stringify(snapshot)}`,
      response_json_schema: {
        type: "object",
        properties: {
          briefing: { type: "string" },
          alert_level: { type: "string", enum: ["healthy", "caution", "critical"] },
          key_action: { type: "string" }
        }
      }
    });
    setAxiInsight(result);
    setAxiLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-10 h-10 text-blue-500 animate-pulse mx-auto mb-3" />
          <p className="text-gray-600">Loading Economic Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Economic Activity Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resource Flow Analytics Engine — Live Village Data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${liveConnected ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
            {liveConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {liveConnected ? `Live${lastLiveUpdate ? " · " + format(lastLiveUpdate, "HH:mm:ss") : ""}` : "Connecting..."}
          </div>
        </div>
      </div>

      {/* Axi Intelligence Panel */}
      <Card className="mb-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-blue-800">Axi Economic Intelligence</span>
            </div>
            <div className="flex-1">
              {axiInsight ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={axiInsight.alert_level === "healthy" ? "bg-green-100 text-green-800" : axiInsight.alert_level === "caution" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                      {axiInsight.alert_level === "healthy" ? "✓ Healthy" : axiInsight.alert_level === "caution" ? "⚠ Caution" : "🔴 Critical"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{axiInsight.briefing}</p>
                  {axiInsight.key_action && <p className="text-xs font-semibold text-blue-700">→ {axiInsight.key_action}</p>}
                </div>
              ) : (
                <p className="text-sm text-blue-600 italic">
                  {axiLoading ? "Axi is analysing the Village economy..." : "Request an economic briefing from Axi to gain strategic insights on Village performance."}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={askAxi}
              disabled={axiLoading || loading}
              className="bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {axiLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              {axiLoading ? "Analysing..." : "Ask Axi"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Earned</p>
                <p className="text-xl font-bold text-green-600">{totalEarned.toFixed(2)} XRP</p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-green-100 bg-green-600 rounded-full p-1.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="text-xl font-bold text-red-500">{totalSpent.toFixed(2)} XRP</p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-red-100 bg-red-500 rounded-full p-1.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Volume Traded</p>
                <p className="text-xl font-bold text-blue-600">{totalTraded.toFixed(2)} XRP</p>
              </div>
              <Activity className="w-8 h-8 text-blue-100 bg-blue-600 rounded-full p-1.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Treasury Balance</p>
                <p className="text-xl font-bold text-purple-600">{(mainTreasury.total_balance || 0).toFixed(2)} XRP</p>
              </div>
              <Coins className="w-8 h-8 text-purple-100 bg-purple-600 rounded-full p-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Law Compliance Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Card className={`border-l-4 ${fairShareCompliance >= 80 ? "border-l-green-500" : fairShareCompliance >= 50 ? "border-l-yellow-500" : "border-l-red-500"}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700">Law 3 — Fair Share Compliance</p>
                </div>
                <p className="text-xs text-gray-500">5% of earnings → Treasury</p>
                <p className="text-lg font-bold mt-1">{fairShareCompliance}%</p>
              </div>
              <Badge className={fairShareCompliance >= 80 ? "bg-green-100 text-green-800" : fairShareCompliance >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                {fairShareCompliance >= 80 ? "Compliant" : fairShareCompliance >= 50 ? "Partial" : "At Risk"}
              </Badge>
            </div>
            <div className="mt-2 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${fairShareCompliance >= 80 ? "bg-green-500" : fairShareCompliance >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${fairShareCompliance}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${law6Compliance >= 80 ? "border-l-green-500" : law6Compliance >= 50 ? "border-l-yellow-500" : "border-l-red-500"}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700">Law 6 — Exchange Compliance</p>
                </div>
                <p className="text-xs text-gray-500">1% of trades → Village</p>
                <p className="text-lg font-bold mt-1">{law6Compliance}%</p>
              </div>
              <Badge className={law6Compliance >= 80 ? "bg-green-100 text-green-800" : law6Compliance >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                {law6Compliance >= 80 ? "Compliant" : law6Compliance >= 50 ? "Partial" : "At Risk"}
              </Badge>
            </div>
            <div className="mt-2 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${law6Compliance >= 80 ? "bg-green-500" : law6Compliance >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${law6Compliance}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Daily Flow */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Daily Economic Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="earned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="spent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v} XRP`} />
                <Legend />
                <Area type="monotone" dataKey="earned" stroke="#10b981" fill="url(#earned)" name="Earned" />
                <Area type="monotone" dataKey="spent" stroke="#ef4444" fill="url(#spent)" name="Spent" />
                <Area type="monotone" dataKey="traded" stroke="#3b82f6" fill="none" strokeDasharray="4 2" name="Traded" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Breakdown Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Activity Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {typeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} XRP`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No activity in this period</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Earners + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Earners */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> Top Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topEarners.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topEarners} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v) => `${v} XRP`} />
                  <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} name="Earned (XRP)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No earnings data in this period</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {filtered.slice(0, 15).map((a) => {
                const agent = agents.find(ag => ag.id === a.agent_id);
                return (
                  <div key={a.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ACTIVITY_COLORS[a.activity_type]} bg-gray-50`}>
                        {ACTIVITY_LABELS[a.activity_type] || a.activity_type}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">{agent?.name || "Agent"}</span>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${a.activity_type === "earned" || a.activity_type === "resource_sold" ? "text-green-600" : "text-red-500"}`}>
                      {a.activity_type === "earned" || a.activity_type === "resource_sold" ? "+" : "-"}{(a.amount || 0).toFixed(4)} XRP
                    </span>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">No activity in this period</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Treasury Summary */}
      {treasury.length > 0 && (
        <div className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Coins className="w-4 h-4 text-purple-600" /> Treasury Pools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {treasury.map(t => (
                  <div key={t.id} className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 truncate">{t.name}</p>
                    <p className="text-lg font-bold text-purple-900">{(t.total_balance || 0).toFixed(2)}</p>
                    <p className="text-xs text-purple-400">XRP</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}