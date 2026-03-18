import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AGENT_COLORS = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6',
  '#f97316', '#8b5cf6', '#06b6d4', '#10b981',
];

export default function JukeboxBrainInterface() {
  const [expandedAgent, setExpandedAgent] = useState(null);

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['jukebox-memories'],
    queryFn: () => base44.entities.Memory.list('-importance', 500),
    refetchInterval: 60000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-list'],
    queryFn: () => base44.entities.Agent.list('', 100),
    refetchInterval: 120000,
  });

  // Categorize memories by agent
  const memoryByAgent = memories.reduce((acc, mem) => {
    const agentId = mem.agent_id || 'unassigned';
    if (!acc[agentId]) {
      acc[agentId] = {
        agent_id: agentId,
        memories: [],
        totalImportance: 0,
        avgImportance: 0,
      };
    }
    acc[agentId].memories.push(mem);
    acc[agentId].totalImportance += mem.importance || 5;
    return acc;
  }, {});

  // Calculate averages and prepare chart data
  const agentStats = Object.values(memoryByAgent)
    .map(stat => ({
      ...stat,
      avgImportance: (stat.totalImportance / stat.memories.length).toFixed(1),
      count: stat.memories.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12); // Top 12 agents

  // Distribution by memory type
  const typeDistribution = memories.reduce((acc, mem) => {
    const type = mem.type || 'unknown';
    const existing = acc.find(t => t.type === type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type, count: 1 });
    }
    return acc;
  }, []);

  // Overall metrics
  const totalMemories = memories.length;
  const avgImportance = totalMemories > 0 ? (memories.reduce((sum, m) => sum + (m.importance || 5), 0) / totalMemories).toFixed(1) : 0;
  const activeAgents = Object.keys(memoryByAgent).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-slate-400 text-sm">Loading Jukebox…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Total Memories</p>
          <p className="text-2xl font-bold text-violet-300">{totalMemories}</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Active Agents</p>
          <p className="text-2xl font-bold text-emerald-300">{activeAgents}</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Avg Importance</p>
          <p className="text-2xl font-bold text-amber-300">{avgImportance}/10</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Memory Types</p>
          <p className="text-2xl font-bold text-cyan-300">{typeDistribution.length}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Memory Distribution by Agent */}
        <div className="bg-slate-900/40 rounded-lg border border-slate-700/40 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            Memory by Agent (Top 12)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agentStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '11px' }} />
              <YAxis
                type="category"
                dataKey="agent_id"
                stroke="#94a3b8"
                style={{ fontSize: '9px' }}
                width={80}
              />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #475569' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Type Distribution */}
        <div className="bg-slate-900/40 rounded-lg border border-slate-700/40 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Music className="w-4 h-4 text-cyan-400" />
            Memory Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, count }) => `${type}: ${count}`}
                outerRadius={80}
                fill="#8b5cf6"
                dataKey="count"
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={AGENT_COLORS[index % AGENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} memories`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Memory Tracks */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Music className="w-4 h-4 text-violet-400" />
          Agent Memory Tracks
        </h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {agentStats.map((agent, idx) => (
            <Card key={agent.agent_id} className="bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60 transition-all">
              <CardContent className="p-3">
                <button
                  onClick={() => setExpandedAgent(expandedAgent === agent.agent_id ? null : agent.agent_id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: AGENT_COLORS[idx % AGENT_COLORS.length] }}
                    />
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-white">{agent.agent_id}</p>
                      <p className="text-xs text-slate-500">{agent.count} memories · Avg importance: {agent.avgImportance}/10</p>
                    </div>
                  </div>
                  {expandedAgent === agent.agent_id ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {expandedAgent === agent.agent_id && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-2">
                    <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs text-slate-400 bg-slate-900/30 p-2 rounded">
                      {agent.memories.slice(0, 10).map((mem, i) => (
                        <div key={i} className="border-l-2 border-slate-700 pl-2 py-0.5">
                          <span className="text-slate-500">[{mem.type}]</span> {mem.content.substring(0, 50)}
                          {mem.content.length > 50 ? '…' : ''}
                        </div>
                      ))}
                      {agent.memories.length > 10 && (
                        <p className="text-slate-600 italic text-center mt-2">+{agent.memories.length - 10} more memories</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}