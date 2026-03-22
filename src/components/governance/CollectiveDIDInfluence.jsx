import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

const ROLE_COLORS = {
  master: '#f59e0b',
  elder: '#a78bfa',
  guardian: '#60a5fa',
  creator: '#34d399',
  teacher: '#f472b6',
  trader: '#fb923c',
  healer: '#2dd4bf',
  scout: '#94a3b8',
  citizen: '#6b7280',
};

const ROLE_BONUS = { master: 5, elder: 4, guardian: 3, creator: 2, teacher: 2, trader: 1, healer: 1, scout: 1, citizen: 0 };

function calcPower(agent) {
  const base = (agent.honor_score || 100) / 10;
  const roleBonus = ROLE_BONUS[agent.role] || 0;
  const axiBonus = agent.name === 'Axi' ? 10 : 0;
  return parseFloat((base + roleBonus + axiBonus).toFixed(1));
}

export default function CollectiveDIDInfluence({ agents, allVotes, proposals }) {
  // Group voting power by role
  const roleInfluence = useMemo(() => {
    const map = {};
    agents.filter(a => a.status === 'active').forEach(agent => {
      const role = agent.role || 'citizen';
      if (!map[role]) map[role] = { role, totalPower: 0, agentCount: 0, votesCount: 0 };
      map[role].totalPower += calcPower(agent);
      map[role].agentCount += 1;
      map[role].votesCount += allVotes.filter(v => v.voter_agent_id === agent.id).length;
    });
    return Object.values(map).sort((a, b) => b.totalPower - a.totalPower);
  }, [agents, allVotes]);

  // Participation rate per role
  const roleParticipation = useMemo(() => {
    if (proposals.length === 0) return [];
    return roleInfluence.map(r => ({
      role: r.role,
      participation: r.agentCount > 0 ? Math.min(100, (r.votesCount / (r.agentCount * Math.max(proposals.length, 1))) * 100).toFixed(0) : 0,
      power: r.totalPower.toFixed(1),
    }));
  }, [roleInfluence, proposals]);

  // Radar data: across-role civic engagement
  const radarData = useMemo(() => roleInfluence.slice(0, 6).map(r => ({
    role: r.role,
    power: r.totalPower,
    participation: parseFloat(r.agentCount > 0 ? Math.min(100, (r.votesCount / (r.agentCount * Math.max(proposals.length, 1))) * 100).toFixed(1) : 0),
  })), [roleInfluence, proposals]);

  if (agents.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          Collective DID Influence by Role
        </CardTitle>
        <p className="text-white/40 text-xs">How sovereign DID groups shape governance outcomes</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Power by Role Bar Chart */}
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={roleInfluence} barSize={18} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="role" tick={{ fill: '#ffffff70', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 11 }}
              formatter={(val, name) => [val.toFixed ? val.toFixed(1) : val, 'Total Power']}
            />
            <Bar dataKey="totalPower" radius={[0, 4, 4, 0]}>
              {roleInfluence.map((entry, i) => (
                <Cell key={i} fill={ROLE_COLORS[entry.role] || '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Role participation pills */}
        <div className="space-y-1.5">
          <p className="text-white/40 text-xs uppercase tracking-wide">Participation Rate by DID Group</p>
          <div className="flex flex-wrap gap-2">
            {roleParticipation.map(r => (
              <div key={r.role} className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ROLE_COLORS[r.role] || '#6b7280' }} />
                <span className="text-white/70 capitalize">{r.role}</span>
                <span className="text-white/40">·</span>
                <span className="text-yellow-300 font-medium">{r.participation}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        {radarData.length >= 3 && (
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={radarData} outerRadius={55}>
              <PolarGrid stroke="#ffffff15" />
              <PolarAngleAxis dataKey="role" tick={{ fill: '#ffffff60', fontSize: 9 }} />
              <Radar name="Power" dataKey="power" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} />
              <Radar name="Participation" dataKey="participation" stroke="#34d399" fill="#34d399" fillOpacity={0.1} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-center gap-3 text-xs text-white/40 pt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Total DID Power</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Participation %</span>
        </div>
      </CardContent>
    </Card>
  );
}