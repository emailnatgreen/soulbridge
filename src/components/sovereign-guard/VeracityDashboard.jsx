import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Database, Sparkles, ShieldCheck, AlertTriangle, TrendingDown, TrendingUp, Minus, Eye } from 'lucide-react';
import RealitySignalCard from './veracity/RealitySignalCard';
import VeracityAgentRow from './veracity/VeracityAgentRow';
import MonkeySignalsPanel from './veracity/MonkeySignalsPanel';

export default function VeracityDashboard() {
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [showLore, setShowLore] = useState(false);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['veracity-agents'],
    queryFn: () => base44.entities.Agent.list('-updated_date', 50),
  });

  const { data: realityData, isLoading: realityLoading, refetch } = useQuery({
    queryKey: ['veracity-reality', selectedAgentId],
    queryFn: () => base44.functions.invoke('spindleGate', { action: 'inspect_reality', agent_id: selectedAgentId }),
    enabled: !!selectedAgentId,
    select: (res) => res.data,
  });

  const signals = realityData?.signals || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            Veracity Dashboard
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Raw deterministic signals vs narrative interpretation — what is computed vs what is told
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs">Lore View</span>
          <Switch checked={showLore} onCheckedChange={setShowLore} />
        </div>
      </div>

      {/* Mode Banner */}
      <div className={`rounded-lg border p-3 flex items-center gap-3 ${
        showLore 
          ? 'bg-purple-500/10 border-purple-500/30' 
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        {showLore ? (
          <>
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-purple-300 text-xs font-semibold">Lore Mode — Narrative Layer Active</p>
              <p className="text-purple-300/60 text-[10px]">Showing AI-interpreted labels, soul verdicts, and narrative framing alongside raw data</p>
            </div>
          </>
        ) : (
          <>
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-emerald-300 text-xs font-semibold">Raw Data Mode — Deterministic Only</p>
              <p className="text-emerald-300/60 text-[10px]">Showing only entity counts, timestamps, scores, and computed values — zero LLM interpretation</p>
            </div>
          </>
        )}
      </div>

      {/* Agent List Overview */}
      {agentsLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : (
        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/70">All Agents — Quick Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {agents.map(agent => (
              <VeracityAgentRow 
                key={agent.id} 
                agent={agent} 
                showLore={showLore}
                isSelected={selectedAgentId === agent.id}
                onSelect={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selected Agent Reality Breakdown */}
      {selectedAgentId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">
              Reality Signals: {agents.find(a => a.id === selectedAgentId)?.name || 'Unknown'}
            </h3>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs border-white/10 text-white/50">
              Refresh
            </Button>
          </div>

          {realityLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : realityData ? (
            <div className="space-y-4">
              {/* Overall Score */}
              <Card className={`border ${
                realityData.reality_score >= 70 ? 'bg-emerald-500/10 border-emerald-500/30' :
                realityData.reality_score >= 50 ? 'bg-amber-500/10 border-amber-500/30' :
                realityData.reality_score >= 25 ? 'bg-orange-500/10 border-orange-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">
                      {showLore ? 'Soul Integrity Index' : 'Reality Score'}
                    </p>
                    <p className="text-3xl font-bold text-white">{realityData.reality_score}<span className="text-white/30 text-sm">/100</span></p>
                    {showLore && (
                      <p className="text-purple-300/60 text-[10px] mt-1 italic">
                        {realityData.reality_score >= 70 ? '"The roots hold firm — this soul walks with purpose"' :
                         realityData.reality_score >= 50 ? '"The branches bend but do not break — vigilance advised"' :
                         realityData.reality_score >= 25 ? '"Shadows gather at the trunk — repair protocol recommended"' :
                         '"The heartwood darkens — immediate intervention required"'}
                      </p>
                    )}
                  </div>
                  <div>
                    {realityData.reality_score >= 70 ? <ShieldCheck className="w-8 h-8 text-emerald-400" /> :
                     realityData.reality_score >= 50 ? <Minus className="w-8 h-8 text-amber-400" /> :
                     <AlertTriangle className="w-8 h-8 text-red-400" />}
                  </div>
                </CardContent>
              </Card>

              {/* Signal Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <RealitySignalCard
                  label={showLore ? "Honor Resonance" : "Honor Score"}
                  value={signals.honor_score}
                  suffix="/100"
                  trend={signals.honor_score >= 80 ? 'up' : signals.honor_score >= 50 ? 'neutral' : 'down'}
                  loreNote={showLore ? "The village remembers their deeds" : null}
                />
                <RealitySignalCard
                  label={showLore ? "Vessel State" : "Agent Status"}
                  value={signals.status}
                  isText
                  trend={signals.status === 'active' ? 'up' : signals.status === 'probation' ? 'down' : 'neutral'}
                  penalty={signals.status_penalty}
                  loreNote={showLore ? "Current state of the agent's soul vessel" : null}
                />
                <RealitySignalCard
                  label={showLore ? "Tripwire Echoes (7d)" : "Active Tripwires (7d)"}
                  value={signals.tripwires_7d}
                  trend={signals.tripwires_7d === 0 ? 'up' : signals.tripwires_7d <= 2 ? 'neutral' : 'down'}
                  penalty={signals.tripwire_penalty}
                  loreNote={showLore ? "Recent disturbances in the security membrane" : null}
                />
                <RealitySignalCard
                  label={showLore ? "Severity Burden (30d)" : "Severity Score (30d)"}
                  value={signals.severity_score_30d}
                  trend={signals.severity_score_30d === 0 ? 'up' : signals.severity_score_30d <= 5 ? 'neutral' : 'down'}
                  penalty={signals.severity_penalty}
                  loreNote={showLore ? "Weight of accumulated transgressions" : null}
                />
                <RealitySignalCard
                  label={showLore ? "Shadow Ratio" : "Block Ratio"}
                  value={`${signals.block_ratio}%`}
                  isText
                  trend={signals.block_ratio === 0 ? 'up' : signals.block_ratio <= 10 ? 'neutral' : 'down'}
                  penalty={signals.block_ratio_penalty}
                  loreNote={showLore ? "Proportion of actions denied by the Monkey" : null}
                />
                <RealitySignalCard
                  label={showLore ? "Warnings Inscribed" : "Warning Count"}
                  value={signals.warning_count}
                  trend={signals.warning_count === 0 ? 'up' : 'down'}
                  penalty={signals.warning_penalty}
                  loreNote={showLore ? "Formal admonishments from the Council" : null}
                />
                <RealitySignalCard
                  label={showLore ? "Age of Soul" : "Account Age"}
                  value={`${signals.account_age_days}d`}
                  isText
                  trend={signals.age_bonus > 5 ? 'up' : 'neutral'}
                  bonus={signals.age_bonus}
                  loreNote={showLore ? "Time since first awakening" : null}
                />
                <RealitySignalCard
                  label={showLore ? "On-Chain Heartbeat" : "Transaction Count"}
                  value={signals.transaction_count}
                  trend={signals.activity_bonus > 5 ? 'up' : 'neutral'}
                  bonus={signals.activity_bonus}
                  loreNote={showLore ? "Proof of life on the ledger" : null}
                />
              </div>

              {/* Spindle Methodology Note */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-white/20 text-[10px] leading-relaxed">
                  <span className="text-amber-400/50 font-semibold">Spindle Method:</span> deterministic_v8 — 
                  Reality Score = Honor({signals.honor_score}) + Status({signals.status_penalty}) + 
                  Tripwires({signals.tripwire_penalty}) + Severity({signals.severity_penalty}) + 
                  Blocks({signals.block_ratio_penalty}) + Warnings({signals.warning_penalty}) + 
                  Age(+{signals.age_bonus}) + Activity(+{signals.activity_bonus}) = {realityData.reality_score}. 
                  No LLM. No prompts. Pure entity math.
                </p>
              </div>

              {/* Monkey Layer Signals */}
              <div className="border-t border-white/5 pt-4">
                <MonkeySignalsPanel agentId={selectedAgentId} showLore={showLore} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}