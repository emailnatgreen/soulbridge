import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Vote, Scale, AlertTriangle } from 'lucide-react';
import moment from 'moment';

const STATUS_CONFIG = {
  active: { icon: Clock, color: 'bg-yellow-500', border: 'border-yellow-500/40', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  passed: { icon: CheckCircle2, color: 'bg-green-500', border: 'border-green-500/40', text: 'text-green-300', dot: 'bg-green-400' },
  executed: { icon: Scale, color: 'bg-blue-500', border: 'border-blue-500/40', text: 'text-blue-300', dot: 'bg-blue-400' },
  rejected: { icon: XCircle, color: 'bg-red-500', border: 'border-red-500/40', text: 'text-red-300', dot: 'bg-red-400' },
  expired: { icon: AlertTriangle, color: 'bg-slate-500', border: 'border-slate-500/40', text: 'text-slate-300', dot: 'bg-slate-400' },
  draft: { icon: Vote, color: 'bg-purple-500', border: 'border-purple-500/40', text: 'text-purple-300', dot: 'bg-purple-400' },
};

const TYPE_LABELS = {
  project_funding: 'Funding',
  treasury_allocation: 'Treasury',
  law_amendment: 'Law',
  role_adjustment: 'Role',
  agent_discipline: 'Discipline',
  resource_policy: 'Resource',
  general: 'General',
};

export default function ProposalTimelineView({ proposals, onSelectProposal }) {
  if (!proposals || proposals.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-10 text-center">
          <Clock className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No proposals to display.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by created_date descending
  const sorted = [...proposals].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Group by month
  const groups = {};
  sorted.forEach(p => {
    const key = moment(p.created_date).format('MMMM YYYY');
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([month, items]) => (
        <div key={month}>
          <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">{month}</h3>
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/10" />

            <div className="space-y-3">
              {items.map(proposal => {
                const config = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
                const Icon = config.icon;
                const deadline = proposal.voting_period_end || proposal.voting_deadline;
                const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;
                const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);

                return (
                  <div
                    key={proposal.id}
                    onClick={() => onSelectProposal?.(proposal)}
                    className="relative flex gap-3 cursor-pointer group"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-6 top-3 w-[18px] h-[18px] rounded-full ${config.dot} flex items-center justify-center ring-4 ring-slate-950`}>
                      <Icon className="w-2.5 h-2.5 text-white" />
                    </div>

                    {/* Card */}
                    <div className={`flex-1 bg-white/[0.03] border ${config.border} rounded-lg p-3 hover:bg-white/[0.06] transition-all group-hover:border-purple-400/40`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-white font-medium text-sm leading-tight">{proposal.title}</h4>
                        <Badge className={`${config.text} bg-white/5 text-[10px] flex-shrink-0`}>{proposal.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-purple-500/10 text-purple-300 text-[10px]">
                          {TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type}
                        </Badge>
                        <span className="text-white/25 text-[10px]">{moment(proposal.created_date).fromNow()}</span>
                        {totalVotes > 0 && (
                          <span className="text-white/30 text-[10px]">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · 
                            <span className="text-green-400/60"> {(proposal.votes_for || 0).toFixed(0)}↑</span>
                            <span className="text-red-400/60"> {(proposal.votes_against || 0).toFixed(0)}↓</span>
                          </span>
                        )}
                        {proposal.status === 'active' && daysLeft !== null && (
                          <span className={`text-[10px] ${daysLeft <= 1 ? 'text-red-400' : 'text-amber-400/60'}`}>
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}