import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CHOICE_COLORS = { for: '#22c55e', against: '#ef4444', abstain: '#94a3b8' };

export default function GovernanceVotePanel({ votes = [], proposals = [], agents = [] }) {
  const agentMap = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a])), [agents]);

  const totalVotingPower = votes.reduce((s, v) => s + (v.voting_power || 0), 0);
  const uniqueVoters = new Set(votes.map(v => v.voter_agent_id)).size;

  const choiceData = useMemo(() => {
    const map = { for: 0, against: 0, abstain: 0 };
    votes.forEach(v => { if (map[v.vote_choice] !== undefined) map[v.vote_choice] += (v.voting_power || 1); });
    return Object.entries(map).map(([choice, power]) => ({ choice, power: +power.toFixed(1), fill: CHOICE_COLORS[choice] }));
  }, [votes]);

  // Proposals with vote tallies
  const proposalStats = useMemo(() => {
    return proposals.slice(0, 6).map(p => {
      const pVotes = votes.filter(v => v.proposal_id === p.id);
      return {
        ...p,
        voteCount: pVotes.length,
        forPower: pVotes.filter(v => v.vote_choice === 'for').reduce((s, v) => s + (v.voting_power || 0), 0),
        againstPower: pVotes.filter(v => v.vote_choice === 'against').reduce((s, v) => s + (v.voting_power || 0), 0),
      };
    });
  }, [proposals, votes]);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" /> Governance Votes — Live Truth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-2">
            <p className="text-blue-300 font-bold text-lg">{votes.length}</p>
            <p className="text-white/40 text-[10px]">Total Votes</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-2">
            <p className="text-amber-300 font-bold text-lg">{totalVotingPower.toFixed(0)}</p>
            <p className="text-white/40 text-[10px]">Voting Power</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-2">
            <p className="text-purple-300 font-bold text-lg">{uniqueVoters}</p>
            <p className="text-white/40 text-[10px]">Unique Voters</p>
          </div>
        </div>

        {/* Choice distribution */}
        {votes.length > 0 && (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={choiceData} barSize={32}>
              <XAxis dataKey="choice" tick={{ fill: '#ffffff70', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              <Bar dataKey="power" radius={[4, 4, 0, 0]}>
                {choiceData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Proposals with tallies */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {proposalStats.map(p => (
            <div key={p.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
              <Vote className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="text-white text-xs flex-1 truncate">{p.title}</span>
              <span className="text-green-300 text-[10px] font-mono">{p.forPower.toFixed(0)}↑</span>
              <span className="text-red-300 text-[10px] font-mono">{p.againstPower.toFixed(0)}↓</span>
              <Badge className="text-[10px] bg-white/5 text-white/50">{p.voteCount}v</Badge>
            </div>
          ))}
          {proposalStats.length === 0 && (
            <p className="text-white/30 text-xs text-center py-4">No proposals found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}