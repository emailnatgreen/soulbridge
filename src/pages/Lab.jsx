import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, FlaskConical } from 'lucide-react';
import NodeStatusGrid from '@/components/lab/NodeStatusGrid';
import RootNote from '@/components/lab/RootNote';
import HonourBoard from '@/components/lab/HonourBoard';
import SkillTreeViewer from '@/components/lab/SkillTreeViewer';
import LoreFeed from '@/components/lab/LoreFeed';
import EntropyProbe from '@/components/lab/EntropyProbe';

export default function Lab() {
  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['lab-nodes'],
    queryFn: () => base44.entities.QuadShardDID.list('-created_date', 50),
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['lab-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 50),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['lab-skills'],
    queryFn: () => base44.entities.AgentSkill.list('-level', 200),
  });

  const { data: lore = [] } = useQuery({
    queryKey: ['lab-lore'],
    queryFn: () => base44.entities.Memory.filter({ type: 'observation' }, '-created_date', 30),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              SoulBridge Lab
              <Shield className="w-5 h-5 text-emerald-400" />
            </h1>
            <p className="text-slate-400 text-xs">8-Node Infinite Security System · Logged · Auditable · Reversible</p>
          </div>
        </div>

        {/* Section 1: Node Status */}
        <NodeStatusGrid nodes={nodes} loading={nodesLoading} />

        {/* Section 2: Entropy Probe — Quantum Mirror */}
        <EntropyProbe />

        {/* Section 7: Root Note (Governor's voice) */}
        <RootNote />

        {/* Two-column layout for medium sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 5: Honour Board */}
          <HonourBoard agents={agents} loading={agentsLoading} />

          {/* Section 4: Skill Tree Viewer */}
          <SkillTreeViewer skills={skills} agents={agents} />
        </div>

        {/* Section 6: Lore Feed */}
        <LoreFeed entries={lore} />
      </div>
    </div>
  );
}