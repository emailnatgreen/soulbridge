import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Trophy, Crown, Medal, Star, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DIMS = [
  { key: 'empathy', label: 'Empathy' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'de_escalation', label: 'De-escalation' },
  { key: 'brand_voice', label: 'Brand Voice' },
  { key: 'context_integration', label: 'Context Integration' },
];

const SORT_OPTIONS = [
  { value: 'overall_diplomacy_score', label: 'Overall Score' },
  { value: 'reviews_completed', label: 'Reviews Completed' },
  { value: 'refined_vintage_ratio', label: 'Refined Vintage %' },
  { value: 'average_verdict_score', label: 'Avg Verdict' },
  { value: 'honor_score', label: 'Honor Score' },
];

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-6 text-right">{value ?? '—'}</span>
    </div>
  );
}

function VerdictBadge({ score }) {
  if (!score) return <span className="text-gray-400 text-xs">—</span>;
  if (score >= 2.7) return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Refined Vintage</Badge>;
  if (score >= 1.7) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">Acceptable</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Needs Work</Badge>;
}

function RankBadge({ rank }) {
  if (rank === 1) return <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 border border-yellow-300"><Crown className="w-4 h-4 text-yellow-500" /></div>;
  if (rank === 2) return <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 border border-slate-300"><Medal className="w-4 h-4 text-slate-400" /></div>;
  if (rank === 3) return <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 border border-amber-300"><Medal className="w-4 h-4 text-amber-600" /></div>;
  return <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 border border-gray-200 text-xs font-bold text-gray-500">{rank}</div>;
}

export default function VillageLeaderboard() {
  const [sortBy, setSortBy] = useState('overall_diplomacy_score');
  const [sortDir, setSortDir] = useState('desc');
  const [dimFilter, setDimFilter] = useState('all');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard-all'],
    queryFn: () => base44.entities.DiplomacyLeaderboardEntry.list('-overall_diplomacy_score', 100),
  });

  const sorted = useMemo(() => {
    let data = [...entries];
    data.sort((a, b) => {
      let aVal = sortBy.startsWith('dim:')
        ? (a.dimension_scores?.[sortBy.replace('dim:', '')] ?? 0)
        : (a[sortBy] ?? 0);
      let bVal = sortBy.startsWith('dim:')
        ? (b.dimension_scores?.[sortBy.replace('dim:', '')] ?? 0)
        : (b[sortBy] ?? 0);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return data;
  }, [entries, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  };

  const activeDim = dimFilter !== 'all' ? dimFilter : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('MayaDiplomacyTraining')}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Training Hub</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Village Diplomacy Leaderboard
            </h1>
            <p className="text-sm text-gray-500">Live rankings · Ranked by diplomatic performance across all 6 dimensions</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{entries.length} agents ranked</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Top 3 Podium */}
        {sorted.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[sorted[1], sorted[0], sorted[2]].map((entry, podiumIdx) => {
              const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
              const heights = ['h-28', 'h-36', 'h-24'];
              const colors = ['bg-slate-100 border-slate-300', 'bg-yellow-50 border-yellow-300', 'bg-amber-50 border-amber-300'];
              if (!entry) return <div key={podiumIdx} />;
              return (
                <div key={entry.id} className={`rounded-xl border-2 ${colors[podiumIdx]} p-4 text-center flex flex-col items-center justify-end ${heights[podiumIdx]}`}>
                  <RankBadge rank={actualRank} />
                  {entry.agent_avatar_url ? (
                    <img src={entry.agent_avatar_url} alt={entry.agent_name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow mt-2" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm mt-2">
                      {entry.agent_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <p className="font-bold text-sm text-gray-800 mt-1 truncate w-full">{entry.agent_name}</p>
                  <p className="text-lg font-bold text-amber-700">{entry.overall_diplomacy_score ?? '—'}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Sort by:</span>
            {SORT_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={sortBy === opt.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => toggleSort(opt.value)}
              >
                {opt.label} <SortIcon field={opt.value} />
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Dimension:</span>
            <Select value={dimFilter} onValueChange={v => { setDimFilter(v); if (v !== 'all') { setSortBy(`dim:${v}`); setSortDir('desc'); } else { setSortBy('overall_diplomacy_score'); } }}>
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue placeholder="All dimensions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dimensions</SelectItem>
                {DIMS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400">Loading leaderboard...</div>
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No entries yet. Complete and evaluate ghost reviews to appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-12">Rank</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Agent</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800" onClick={() => toggleSort('overall_diplomacy_score')}>
                        Overall <SortIcon field="overall_diplomacy_score" />
                      </th>
                      {activeDim ? (
                        <th className="text-center px-3 py-3 text-xs font-semibold text-purple-600">
                          {DIMS.find(d => d.key === activeDim)?.label}
                        </th>
                      ) : (
                        <>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Empathy</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Clarity</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden xl:table-cell">Problem Solving</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden xl:table-cell">De-escalation</th>
                        </>
                      )}
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800" onClick={() => toggleSort('reviews_completed')}>
                        Reviews <SortIcon field="reviews_completed" />
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800" onClick={() => toggleSort('refined_vintage_ratio')}>
                        RV% <SortIcon field="refined_vintage_ratio" />
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800" onClick={() => toggleSort('average_verdict_score')}>
                        Avg Verdict <SortIcon field="average_verdict_score" />
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800" onClick={() => toggleSort('honor_score')}>
                        Honor <SortIcon field="honor_score" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((entry, idx) => (
                      <tr key={entry.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx < 3 ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <RankBadge rank={idx + 1} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {entry.agent_avatar_url ? (
                              <img src={entry.agent_avatar_url} alt={entry.agent_name} className="w-8 h-8 rounded-full object-cover border" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                {entry.agent_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-800">{entry.agent_name}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{entry.agent_role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-base font-bold text-amber-700">{entry.overall_diplomacy_score ?? '—'}</span>
                        </td>
                        {activeDim ? (
                          <td className="px-3 py-3 text-center">
                            <ScoreBar value={entry.dimension_scores?.[activeDim] ?? null} />
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-3 hidden lg:table-cell"><ScoreBar value={entry.dimension_scores?.empathy ?? null} /></td>
                            <td className="px-3 py-3 hidden lg:table-cell"><ScoreBar value={entry.dimension_scores?.clarity ?? null} /></td>
                            <td className="px-3 py-3 hidden xl:table-cell"><ScoreBar value={entry.dimension_scores?.problem_solving ?? null} /></td>
                            <td className="px-3 py-3 hidden xl:table-cell"><ScoreBar value={entry.dimension_scores?.de_escalation ?? null} /></td>
                          </>
                        )}
                        <td className="px-3 py-3 text-center text-gray-700 font-medium">{entry.reviews_completed ?? 0}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-semibold text-green-700">{entry.refined_vintage_ratio != null ? `${entry.refined_vintage_ratio}%` : '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center"><VerdictBadge score={entry.average_verdict_score} /></td>
                        <td className="px-3 py-3 text-center">
                          <span className="flex items-center justify-center gap-0.5 text-xs font-medium text-yellow-700">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{entry.honor_score ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400 text-center mt-4">
          Rankings update automatically after each evaluation · Last entry updated {entries[0]?.last_updated ? new Date(entries[0].last_updated).toLocaleString() : '—'}
        </p>
      </div>
    </div>
  );
}