import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GitBranch, ExternalLink, FileText, DollarSign, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import CreateGrantModal from '@/components/grants/CreateGrantModal';
import GrantProposalCard from '@/components/grants/GrantProposalCard';

const STATUS_CONFIG = {
  drafting: { label: 'Drafting', color: 'bg-slate-500', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-500', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-purple-500', icon: GitBranch },
  milestone_review: { label: 'Milestone Review', color: 'bg-cyan-500', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: AlertCircle },
};

export default function RippleGrantDashboard() {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['grant-proposals'],
    queryFn: () => base44.entities.GrantProposal.list('-created_date', 50),
  });

  const filtered = filter === 'all' 
    ? proposals 
    : proposals.filter(p => p.status === filter);

  const totalRequested = proposals.reduce((sum, p) => sum + (p.requested_amount_usd || 0), 0);
  const totalApproved = proposals.reduce((sum, p) => sum + (p.approved_amount_usd || 0), 0);
  const activeCount = proposals.filter(p => ['approved', 'in_progress', 'milestone_review'].includes(p.status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <GitBranch className="w-7 h-7 text-purple-400" />
              Ripple Grant Proposals
            </h1>
            <p className="text-white/50 text-sm mt-1">Manage grant proposals with GitHub integration — Law 2 (Honour) • Law 9 (Growth)</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white gap-2">
            <Plus className="w-4 h-4" /> New Proposal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Proposals" value={proposals.length} icon={FileText} color="purple" />
          <StatCard label="Active Grants" value={activeCount} icon={GitBranch} color="green" />
          <StatCard label="Requested" value={`$${totalRequested.toLocaleString()}`} icon={DollarSign} color="blue" />
          <StatCard label="Approved" value={`$${totalApproved.toLocaleString()}`} icon={CheckCircle} color="emerald" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          <FilterTab label="All" value="all" current={filter} onClick={setFilter} count={proposals.length} />
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = proposals.filter(p => p.status === key).length;
            if (count === 0) return null;
            return <FilterTab key={key} label={cfg.label} value={key} current={filter} onClick={setFilter} count={count} />;
          })}
        </div>

        {/* Proposals Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <GitBranch className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No grant proposals yet. Create your first one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(proposal => (
              <GrantProposalCard 
                key={proposal.id} 
                proposal={proposal} 
                statusConfig={STATUS_CONFIG}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['grant-proposals'] })}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGrantModal 
          onClose={() => setShowCreate(false)} 
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['grant-proposals'] });
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        <div>
          <p className="text-white/40 text-xs">{label}</p>
          <p className="text-white font-bold text-lg">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterTab({ label, value, current, onClick, count }) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active 
          ? 'bg-purple-600 text-white' 
          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
      }`}
    >
      {label} ({count})
    </button>
  );
}