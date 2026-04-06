import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Vote, Zap, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ComprehensiveAnalyticsDashboard() {
  // Fetch all necessary data for analytics
  const { data: agents = [] } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn: () => base44.entities.Agent.list('-updated_date', 200),
    refetchInterval: 60000
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['analytics-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.filter({ status: 'active' }),
    refetchInterval: 60000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['analytics-projects'],
    queryFn: () => base44.entities.AIProject.filter({}, '-updated_date', 100),
    refetchInterval: 60000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['analytics-tasks'],
    queryFn: () => base44.entities.ProjectTask.list('-updated_date', 200),
    refetchInterval: 60000
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['analytics-votes'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 200),
    refetchInterval: 60000
  });

  const analytics = useMemo(() => {
    // Agent Analytics
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const avgHonor = agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + (a.honor_score || 100), 0) / agents.length) : 0;
    const honorDistribution = [
      { range: 'Legendary (90+)', count: agents.filter(a => (a.honor_score || 0) >= 90).length },
      { range: 'Elite (75-89)', count: agents.filter(a => (a.honor_score || 0) >= 75 && (a.honor_score || 0) < 90).length },
      { range: 'Respected (50-74)', count: agents.filter(a => (a.honor_score || 0) >= 50 && (a.honor_score || 0) < 75).length },
      { range: 'Citizen (0-49)', count: agents.filter(a => (a.honor_score || 0) < 50).length }
    ];

    // Project Analytics
    const projectStats = {
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      planning: projects.filter(p => p.status === 'planning').length,
      onHold: projects.filter(p => p.status === 'on_hold').length
    };

    // Task Analytics
    const taskStats = {
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      blocked: tasks.filter(t => t.status === 'blocked').length
    };

    // Governance Analytics
    const proposalStats = {
      active: proposals.length,
      avgParticipation: proposals.length > 0 ? Math.round(proposals.reduce((sum, p) => sum + (p.total_votes_cast || 0), 0) / proposals.length) : 0
    };

    const votesByType = proposals.reduce((acc, p) => {
      acc.push({
        proposal: p.title.substring(0, 20) + '...',
        for: p.votes_for || 0,
        against: p.votes_against || 0,
        abstain: p.votes_abstain || 0
      });
      return acc;
    }, []).slice(0, 5);

    return {
      activeAgents,
      avgHonor,
      honorDistribution,
      projectStats,
      taskStats,
      proposalStats,
      votesByType
    };
  }, [agents, proposals, projects, tasks, votes]);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-violet-900/30 border border-violet-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-violet-300">Active Agents</p>
              <p className="text-2xl font-bold text-white">{analytics.activeAgents}</p>
            </div>
            <Users className="w-8 h-8 text-violet-500 opacity-50" />
          </div>
        </div>

        <div className="bg-indigo-900/30 border border-indigo-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-300">Avg Honor</p>
              <p className="text-2xl font-bold text-white">{analytics.avgHonor}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-indigo-500 opacity-50" />
          </div>
        </div>

        <div className="bg-pink-900/30 border border-pink-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-pink-300">Active Projects</p>
              <p className="text-2xl font-bold text-white">{analytics.projectStats.active}</p>
            </div>
            <Zap className="w-8 h-8 text-pink-500 opacity-50" />
          </div>
        </div>

        <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-300">Active Proposals</p>
              <p className="text-2xl font-bold text-white">{analytics.proposalStats.active}</p>
            </div>
            <Vote className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Honor Distribution */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Agent Honor Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={analytics.honorDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80}>
                {analytics.honorDistribution.map((_, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Distribution */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Project Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Active', value: analytics.projectStats.active },
              { name: 'Planning', value: analytics.projectStats.planning },
              { name: 'Completed', value: analytics.projectStats.completed },
              { name: 'On Hold', value: analytics.projectStats.onHold }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Task Status */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Task Execution Status</h3>
          <div className="space-y-2">
            {[
              { label: 'Completed', value: analytics.taskStats.completed, color: 'bg-green-600' },
              { label: 'In Progress', value: analytics.taskStats.inProgress, color: 'bg-blue-600' },
              { label: 'To Do', value: analytics.taskStats.todo, color: 'bg-slate-600' },
              { label: 'Blocked', value: analytics.taskStats.blocked, color: 'bg-red-600' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-16 text-xs text-slate-400">{item.label}</div>
                <div className="flex-1 bg-slate-700 rounded h-6 relative overflow-hidden">
                  <div className={`${item.color} h-full flex items-center justify-center text-xs font-semibold text-white`} style={{ width: `${(item.value / Math.max(Object.values(analytics.taskStats).reduce((a, b) => a + b, 1), 1)) * 100}%` }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance Voting Trends */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Proposal Voting Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.votesByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="proposal" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
              <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Legend />
              <Bar dataKey="for" fill="#10b981" />
              <Bar dataKey="against" fill="#ef4444" />
              <Bar dataKey="abstain" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Insights */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Key Insights
        </h3>
        <ul className="text-xs text-slate-300 space-y-1">
          <li>• {analytics.activeAgents} agents are currently active with average honor score of {analytics.avgHonor}</li>
          <li>• {analytics.projectStats.active} projects in active execution with {analytics.taskStats.completed} tasks completed</li>
          <li>• {analytics.proposalStats.active} governance proposals active with avg {analytics.proposalStats.avgParticipation} participant(s) per proposal</li>
          <li>• {analytics.taskStats.blocked} tasks currently blocked—prioritize mitigation</li>
        </ul>
      </div>
    </div>
  );
}