import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import moment from 'moment';

const VOTE_COLORS = { for: '#22c55e', against: '#ef4444', abstain: '#6b7280' };

export default function GovernanceStats({ votes, agentId }) {
  const forVotes = votes.filter(v => v.vote_choice === 'for').length;
  const againstVotes = votes.filter(v => v.vote_choice === 'against').length;
  const abstainVotes = votes.filter(v => v.vote_choice === 'abstain').length;
  const totalPower = votes.reduce((s, v) => s + (v.voting_power || 0), 0);

  const pieData = [
    { name: 'For', value: forVotes },
    { name: 'Against', value: againstVotes },
    { name: 'Abstain', value: abstainVotes },
  ].filter(d => d.value > 0);

  if (votes.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-10 text-center">
          <Vote className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No governance votes cast yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Total Votes</p>
            <p className="text-2xl font-bold text-white">{votes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Voting Power Used</p>
            <p className="text-2xl font-bold text-white">{totalPower.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">For / Against</p>
            <p className="text-2xl font-bold text-white">
              <span className="text-green-400">{forVotes}</span>
              {' / '}
              <span className="text-red-400">{againstVotes}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center justify-center">
            {pieData.length > 0 && (
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={20} outerRadius={35}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={VOTE_COLORS[entry.name.toLowerCase()]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vote History */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Vote History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {votes.map(vote => {
              const Icon = vote.vote_choice === 'for' ? ThumbsUp : vote.vote_choice === 'against' ? ThumbsDown : Minus;
              const color = vote.vote_choice === 'for' ? 'text-green-400' : vote.vote_choice === 'against' ? 'text-red-400' : 'text-slate-400';
              return (
                <div key={vote.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm truncate">Proposal: {vote.proposal_id?.slice(0, 12)}...</p>
                    {vote.rationale && <p className="text-white/30 text-xs truncate">{vote.rationale}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className="bg-white/5 text-white/40 text-[10px]">Power: {vote.voting_power?.toFixed(1)}</Badge>
                    <p className="text-white/20 text-[10px] mt-0.5">{moment(vote.created_date).fromNow()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}