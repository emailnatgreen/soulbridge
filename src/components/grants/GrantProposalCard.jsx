import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GitBranch, ExternalLink, DollarSign, Calendar, Users, Loader2, FolderGit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function GrantProposalCard({ proposal, statusConfig, onRefresh }) {
  const [creatingRepo, setCreatingRepo] = useState(false);
  const cfg = statusConfig[proposal.status] || statusConfig.drafting;
  const StatusIcon = cfg.icon;

  const handleCreateRepo = async () => {
    setCreatingRepo(true);
    try {
      const res = await base44.functions.invoke('createGrantRepo', {
        grant_proposal_id: proposal.id,
      });
      toast.success(`Repository created: ${res.data.repository.name}`);
      onRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to create repository');
    }
    setCreatingRepo(false);
  };

  const completedMilestones = (proposal.milestones || []).filter(m => m.status === 'approved').length;
  const totalMilestones = (proposal.milestones || []).length;

  return (
    <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition group">
      <CardContent className="p-4 space-y-3">
        {/* Status + Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${cfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
              <span className="text-white/30 text-[10px] uppercase">{(proposal.grant_program || '').replace(/_/g, ' ')}</span>
            </div>
            <h3 className="text-white font-semibold text-sm truncate">{proposal.title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/40 text-xs line-clamp-2">{proposal.description}</p>

        {/* Metrics */}
        <div className="flex flex-wrap gap-3 text-xs">
          {proposal.requested_amount_usd > 0 && (
            <span className="flex items-center gap-1 text-white/50">
              <DollarSign className="w-3 h-3" />
              {proposal.requested_amount_usd.toLocaleString()}
            </span>
          )}
          {totalMilestones > 0 && (
            <span className="flex items-center gap-1 text-white/50">
              <Calendar className="w-3 h-3" />
              {completedMilestones}/{totalMilestones} milestones
            </span>
          )}
          {proposal.team_members?.length > 0 && (
            <span className="flex items-center gap-1 text-white/50">
              <Users className="w-3 h-3" />
              {proposal.team_members.length}
            </span>
          )}
        </div>

        {/* GitHub Link or Create Button */}
        <div className="pt-2 border-t border-white/5">
          {proposal.github_repo_url ? (
            <a href={proposal.github_repo_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-xs">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span className="truncate">{proposal.github_repo_name}</span>
              <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
            </a>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleCreateRepo} disabled={creatingRepo}
              className="text-purple-400 text-xs h-7 gap-1.5 w-full justify-start hover:bg-purple-500/10">
              {creatingRepo ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
              Create GitHub Repository
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}