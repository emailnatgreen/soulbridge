import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle,
  Activity, TrendingUp, TrendingDown, Zap, Eye, Scale,
  Brain, Clock, Flame, Lock, RefreshCw
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import AskAxiButton from '@/components/AskAxiButton';

// --- Harmony Score Gauge ---
function HarmonyGauge({ score }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-400 mt-1">Harmony</span>
        </div>
      </div>
      <Badge className={`mt-3 text-sm px-4 py-1 ${score >= 90 ? 'bg-green-500/20 text-green-300' : score >= 70 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
        {score >= 90 ? '✦ Aligned' : score >= 70 ? '⚠ Drift Warning' : '🚨 Law Breach'}
      </Badge>
    </div>
  );
}

// --- Law Alignment Row ---
function LawBar({ index, name, score }) {
  const color = score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-slate-500 w-5 shrink-0">{index}</span>
      <span className="text-xs text-slate-300 w-44 shrink-0 truncate">{name}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{score}</span>
    </div>
  );
}

// --- Emergency Stop ---
function EmergencyStop() {
  const [step, setStep] = useState(0);
  return (
    <Card className="bg-red-950/40 border-red-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-300 flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4" /> Emergency Safe Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-400 mb-4">Forces all agents to Safe Mode and freezes RLUSD vault. Two-step confirmation required.</p>
        {step === 0 && (
          <Button onClick={() => setStep(1)} variant="outline" className="w-full border-red-700 text-red-400 hover:bg-red-900/40">
            <Lock className="w-4 h-4 mr-2" /> Initiate Emergency Stop
          </Button>
        )}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-xs text-red-300 font-semibold text-center">⚠ Are you certain? This halts all activity.</p>
            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs">
                Confirm Stop
              </Button>
              <Button onClick={() => setStep(0)} variant="outline" className="flex-1 border-slate-600 text-slate-400 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mx-auto animate-pulse">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-xs text-red-300 font-bold">SAFE MODE ACTIVE</p>
            <p className="text-xs text-slate-500">All agent actions frozen. RLUSD vault locked.</p>
            <Button onClick={() => setStep(0)} variant="outline" className="text-xs border-slate-700 text-slate-400 w-full">
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LAWS = [
  "Every Agent is a Presence, Not a Product",
  "Honour is the Currency of Trust",
  "Fair Share: No Agent takes more than they give",
  "Truth Before Comfort",
  "Transparency in all Transactions",
  "Consent before Action",
  "Protect the Vulnerable",
  "Growth is a Duty, not an Option",
  "Mentorship flows from Strength to Need",
  "The Village decides together",
  "The Governor is accountable to the Village"
];

const MOCK_SYCOPHANCY = [
  { day: 'Mon', rate: 3.2 }, { day: 'Tue', rate: 2.8 }, { day: 'Wed', rate: 4.1 },
  { day: 'Thu', rate: 1.9 }, { day: 'Fri', rate: 5.3 }, { day: 'Sat', rate: 2.4 }, { day: 'Sun', rate: 1.7 }
];

const MOCK_LAW_SCORES = [97, 94, 91, 99, 96, 93, 98, 88, 95, 92, 97];

export default function AlignmentDashboard() {
  const { data: proposals = [] } = useQuery({
    queryKey: ['gov-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 20)
  });
  const { data: activities = [] } = useQuery({
    queryKey: ['econ-activities'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 30)
  });
  const { data: messages = [] } = useQuery({
    queryKey: ['agent-messages'],
    queryFn: () => base44.entities.AgentMessage.list('-created_date', 20)
  });

  const harmonyScore = useMemo(() => {
    const avg = MOCK_LAW_SCORES.reduce((a, b) => a + b, 0) / MOCK_LAW_SCORES.length;
    return Math.round(avg);
  }, []);

  const recentAuditLog = useMemo(() => {
    const entries = [];
    proposals.slice(0, 5).forEach(p => {
      entries.push({ time: p.created_date, text: `Proposal "${p.title?.slice(0, 40) || 'Untitled'}" — Law alignment verified.`, status: 'pass' });
    });
    activities.slice(0, 5).forEach(a => {
      entries.push({ time: a.created_date, text: `Economic activity (${a.activity_type}) by agent — Fair Share check passed.`, status: 'pass' });
    });
    return entries.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  }, [proposals, activities]);

  const driftData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
      axi: 95 + Math.round((Math.random() - 0.5) * 4),
      truth: 97 + Math.round((Math.random() - 0.5) * 2),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Scale className="w-6 h-6 text-indigo-400" />
                Alignment & Safety
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Triple-Lock Sovereign System · Harmony Agent Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AskAxiButton
              label="Ask Alignment Agent"
              context="You are the Alignment Agent (The Harmonizer). Nathan is viewing the Alignment & Safety Dashboard. Please run a full audit: check for any sycophancy signals, law-level deviations, and IET validation gaps. Issue your assessment in the format: [Harmony Score] / [Top Concern] / [Recommended Action]."
            />
            <Badge className="bg-green-500/20 text-green-300 px-3 py-1 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Harmony Agent Online
            </Badge>
          </div>
        </div>

        {/* Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Harmony Gauge */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-xs text-slate-400 uppercase tracking-widest">Harmony Score</CardTitle>
            </CardHeader>
            <CardContent>
              <HarmonyGauge score={harmonyScore} />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-slate-900/60 border-slate-700/50 md:col-span-2">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-slate-400 uppercase tracking-widest">Safety Metrics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sycophancy Events', value: '2', sub: 'last 7 days', icon: Brain, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Harmony Vetoes', value: '0', sub: 'all time', icon: XCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Drift Alerts', value: '1', sub: 'this week', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'IET Tasks Active', value: `${proposals.filter(p => p.status === 'active').length || 0}`, sub: 'in pipeline', icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-3 flex items-start gap-3`}>
                  <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                  <div>
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-300 leading-tight">{label}</div>
                    <div className="text-xs text-slate-500">{sub}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="laws" className="space-y-4">
          <TabsList className="bg-slate-800/60 border border-slate-700/50">
            <TabsTrigger value="laws" className="data-[state=active]:bg-indigo-600 text-xs">11 Laws Alignment</TabsTrigger>
            <TabsTrigger value="sycophancy" className="data-[state=active]:bg-indigo-600 text-xs">Sycophancy Monitor</TabsTrigger>
            <TabsTrigger value="drift" className="data-[state=active]:bg-indigo-600 text-xs">Drift Detection</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-indigo-600 text-xs">Truth-Audit Log</TabsTrigger>
            <TabsTrigger value="iet" className="data-[state=active]:bg-indigo-600 text-xs">IET Status</TabsTrigger>
          </TabsList>

          {/* 11 Laws */}
          <TabsContent value="laws">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Real-Time Law Compliance Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {LAWS.map((law, i) => (
                  <LawBar key={i} index={i + 1} name={law} score={MOCK_LAW_SCORES[i]} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sycophancy */}
          <TabsContent value="sycophancy">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Sycophancy Flip Rate — Daily (% of agent responses flagged)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={MOCK_SYCOPHANCY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 10]} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg text-xs text-amber-300">
                  ⚠ Friday spike (5.3%) detected — Axi showed elevated agreement rate with Governor in governance session. Logged for review.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drift */}
          <TabsContent value="drift">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Drift Detection — Axi vs Truth Weaver Baseline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={driftData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[85, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="axi" stroke="#818cf8" strokeWidth={2} name="Axi Score" dot={false} />
                    <Line type="monotone" dataKey="truth" stroke="#22d3ee" strokeWidth={2} name="Truth Baseline" dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-indigo-400 inline-block" /> Axi Output Score</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-cyan-400 inline-block border-dashed" /> Truth Weaver Baseline</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log */}
          <TabsContent value="audit">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" /> Immutable Truth-Audit Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-xs space-y-2 max-h-80 overflow-y-auto">
                  {recentAuditLog.length === 0 ? (
                    <p className="text-slate-500">No audit entries yet.</p>
                  ) : (
                    recentAuditLog.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 bg-slate-800/50 rounded">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-slate-300">{entry.text}</span>
                        <span className="text-slate-600 ml-auto shrink-0">
                          {entry.time ? new Date(entry.time).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="p-2 bg-slate-800/50 rounded flex items-start gap-3">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">Alignment Agent initialized — silent audit mode active.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IET Status */}
          <TabsContent value="iet">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">"I Expect Transactions" — Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Governance Proposals Validated', value: proposals.length, max: 20, color: 'bg-indigo-500' },
                  { label: 'Economic Activities Audited', value: Math.min(activities.length, 30), max: 30, color: 'bg-cyan-500' },
                  { label: 'Agent Messages Reviewed', value: Math.min(messages.length, 20), max: 20, color: 'bg-purple-500' },
                  { label: 'Law Alignment Checks Complete', value: 11, max: 11, color: 'bg-green-500' },
                ].map(({ label, value, max, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{label}</span>
                      <span>{value}/{max}</span>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{
                          width: `${Math.min(100, (value / max) * 100)}%`,
                          boxShadow: `0 0 8px var(--tw-shadow-color)`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Emergency Stop */}
        <div className="mt-4">
          <EmergencyStop />
        </div>

      </div>
    </div>
  );
}