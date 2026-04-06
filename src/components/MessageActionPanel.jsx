import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Zap, Vote, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function MessageActionPanel({ message, recipientAgent, fromAgent }) {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('Task title required');
      return;
    }

    try {
      await base44.entities.AgentTask.create({
        title: taskTitle,
        description: taskDesc,
        assigned_to_agent_id: recipientAgent.id,
        created_by_agent_id: fromAgent.id,
        related_message_id: message.id,
        status: 'pending',
      });
      toast.success('Task created from conversation');
      setTaskTitle('');
      setTaskDesc('');
      setIsCreatingTask(false);
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleCreateProposal = async () => {
    if (!proposalTitle.trim()) {
      toast.error('Proposal title required');
      return;
    }

    try {
      await base44.entities.GovernanceProposal.create({
        title: proposalTitle,
        description: proposalDesc,
        proposal_type: 'general',
        proposed_by: fromAgent.id,
        status: 'draft',
        discussion_messages: [message.id],
      });
      toast.success('Proposal draft created from conversation');
      setProposalTitle('');
      setProposalDesc('');
      setIsCreatingProposal(false);
    } catch (error) {
      toast.error('Failed to create proposal');
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={isCreatingTask} onOpenChange={setIsCreatingTask}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="border-white/10 text-white/80 hover:text-white h-8">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Create Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create Task from Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <Textarea
              placeholder="Task description (optional)"
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="text-xs text-white/60 p-2 bg-blue-500/10 rounded border border-blue-500/20">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Task will be assigned to {recipientAgent.name}
            </div>
            <Button
              onClick={handleCreateTask}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingProposal} onOpenChange={setIsCreatingProposal}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="border-white/10 text-white/80 hover:text-white h-8">
            <Vote className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Create Proposal</span>
            <span className="sm:hidden">Proposal</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create Governance Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Proposal title"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <Textarea
              placeholder="Proposal description"
              value={proposalDesc}
              onChange={(e) => setProposalDesc(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="text-xs text-white/60 p-2 bg-purple-500/10 rounded border border-purple-500/20">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Proposal will be created as a draft and linked to this conversation
            </div>
            <Button
              onClick={handleCreateProposal}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Create Proposal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}