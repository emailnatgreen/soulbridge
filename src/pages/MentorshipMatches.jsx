import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star, Brain, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import FilterBar from '@/components/filters/FilterBar';

const MATCH_FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: ['pending','active','completed','cancelled'] },
  { key: 'style', label: 'Mentorship Style', type: 'select', options: ['coaching','teaching','collaborative','advisory'] },
  { key: 'minScore', label: 'Min Match Score', type: 'range', min: 0, max: 100 },
];

const SORT_OPTIONS = [
  { value: '-match_score', label: 'Best Match' },
  { value: '-created_date', label: 'Newest' },
  { value: 'status', label: 'Status' },
];

const STATUS_CFG = {
  pending:   'bg-amber-900/40 text-amber-300 border-amber-700/40',
  active:    'bg-green-900/40 text-green-300 border-green-700/40',
  completed: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  cancelled: 'bg-red-900/40 text-red-300 border-red-700/40',
};

export default function MentorshipMatches() {
  const queryClient = useQueryClient();
  const [filterValues, setFilterValues] = useState({ search: '', status: 'all', style: 'all', minScore: { min: 0, max: 100 } });
  const [sortBy, setSortBy] = useState('-match_score');

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['mentorship-matches'],
    queryFn: () => base44.entities.MentorshipMatch.list('-created_date', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-mentor-matches'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['mentor-profiles'],
    queryFn: () => base44.entities.MentorProfile.list(),
  });

  const acceptMutation = useMutation({
    mutationFn: (id) => base44.entities.MentorshipMatch.update(id, { status: 'active' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mentorship-matches'] }); toast.success('Match accepted!'); },
  });

  const declineMutation = useMutation({
    mutationFn: (id) => base44.entities.MentorshipMatch.update(id, { status: 'cancelled' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mentorship-matches'] }); toast.success('Match declined.'); },
  });

  const getAgent = (id) => agents.find(a => a.id === id);

  const filtered = matches.filter(m => {
    const mentorAgent = getAgent(m.mentor_id || m.mentor_agent_id);
    const menteeAgent = getAgent(m.mentee_id || m.mentee_agent_id);
    const q = filterValues.search?.toLowerCase();
    if (q && !`${mentorAgent?.name} ${menteeAgent?.name} ${m.focus_area}`.toLowerCase().includes(q)) return false;
    if (filterValues.status !== 'all' && m.status !== filterValues.status) return false;
    if (filterValues.style !== 'all' && m.mentorship_style !== filterValues.style) return false;
    if (filterValues.minScore?.min > 0 && (m.match_score ?? 0) < filterValues.minScore.min) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === '-match_score') return (b.match_score ?? 0) - (a.match_score ?? 0);
    if (sortBy === '-created_date') return new Date(b.created_date) - new Date(a.created_date);
    return 0;
  });

  const activeCount = matches.filter(m => m.status === 'active').length;
  const pendingCount = matches.filter(m => m.status === 'pending').length;
  const avgScore = matches.length > 0 ? Math.round(matches.reduce((s, m) => s + (m.match_score ?? 70), 0) / matches.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950/20 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-pink-400" />Mentorship Matches
            </h1>
            <p className="text-slate-400 text-sm mt-1">{matches.length} total matches</p>
          </div>
          <Link to={createPageUrl('BecomeMentor')}>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white border-0">Become a Mentor</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Matches', val: activeCount, color: 'text-green-400' },
            { label: 'Pending', val: pendingCount, color: 'text-amber-400' },
            { label: 'Avg Match Score', val: `${avgScore}%`, color: 'text-pink-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <FilterBar
          filters={MATCH_FILTERS}
          values={filterValues}
          onChange={setFilterValues}
          searchKey="search"
          searchPlaceholder="Search mentors, mentees, focus areas…"
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          resultCount={filtered.length}
        />

        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading matches…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No matches found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(match => {
              const mentor = getAgent(match.mentor_id || match.mentor_agent_id);
              const mentee = getAgent(match.mentee_id || match.mentee_agent_id);
              const statusCls = STATUS_CFG[match.status] || STATUS_CFG.pending;
              return (
                <Card key={match.id} className="bg-slate-900/60 border-slate-700/40 hover:border-pink-500/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Mentor → Mentee */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="text-center min-w-0">
                          <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto">
                            <Star className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="text-xs text-slate-300 mt-1 truncate max-w-24">{mentor?.name || 'Mentor'}</div>
                          <div className="text-xs text-slate-600 capitalize">{mentor?.role}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                        <div className="text-center min-w-0">
                          <div className="w-9 h-9 rounded-full bg-pink-600/20 border border-pink-500/30 flex items-center justify-center mx-auto">
                            <Brain className="w-4 h-4 text-pink-400" />
                          </div>
                          <div className="text-xs text-slate-300 mt-1 truncate max-w-24">{mentee?.name || 'Mentee'}</div>
                          <div className="text-xs text-slate-600 capitalize">{mentee?.role}</div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        {match.focus_area && <p className="text-sm text-slate-300 truncate">{match.focus_area}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`text-xs border ${statusCls} capitalize`}>{match.status}</Badge>
                          {match.mentorship_style && (
                            <Badge className="text-xs bg-slate-800 border-slate-700 text-slate-400 capitalize">{match.mentorship_style}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Score + Actions */}
                      <div className="text-right shrink-0 space-y-2">
                        {match.match_score !== undefined && (
                          <div>
                            <div className="text-xl font-bold text-pink-400">{match.match_score}%</div>
                            <div className="text-xs text-slate-500">match</div>
                          </div>
                        )}
                        {match.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => acceptMutation.mutate(match.id)}
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 border-0">Accept</Button>
                            <Button size="sm" variant="outline" onClick={() => declineMutation.mutate(match.id)}
                              className="h-7 text-xs border-red-700 text-red-400 hover:text-red-300">Decline</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}