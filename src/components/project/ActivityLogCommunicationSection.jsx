import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageSquare, Activity, Send, Loader } from 'lucide-react';

export default function ActivityLogCommunicationSection({ project, agents = [] }) {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch agent messages related to project
  const { data: messages = [] } = useQuery({
    queryKey: ['projectMessages', project.id],
    queryFn: async () => {
      try {
        const allMessages = await base44.entities.AgentMessage?.list?.('-created_date', 100) || [];
        return allMessages
          .filter(m => m.content?.toLowerCase().includes(project.title?.toLowerCase()) || 
                       m.project_id === project.id)
          .slice(0, 20);
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  // Fetch tasks to build activity log
  const { data: tasks = [] } = useQuery({
    queryKey: ['projectActivityTasks', project.id],
    queryFn: async () => {
      try {
        const allTasks = await base44.entities.ProjectTask.list('-updated_date', 100);
        return allTasks.filter(t => t.project_id === project.id);
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async (messageText) => {
      const currentUser = await base44.auth.me();
      return base44.entities.AgentMessage.create({
        content: messageText,
        project_id: project.id,
        agent_id: currentUser?.id || 'anonymous',
        sender_email: currentUser?.email || '',
      });
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['projectMessages', project.id] });
    },
  });

  // Resolve agent info
  const resolveAgent = (agentId) => {
    return agents.find(a => a.id === agentId);
  };

  // Get agent name from email or ID
  const getAgentDisplay = (agentIdOrEmail) => {
    const agent = agents.find(a => a.id === agentIdOrEmail || a.email === agentIdOrEmail);
    return agent || { name: agentIdOrEmail?.split('@')?.[0] || 'Unknown Agent', classic_address: '' };
  };

  // Build activity timeline from tasks and messages combined
  const activities = [
    ...tasks.map(t => ({
      type: 'task',
      timestamp: t.updated_date || t.created_date,
      content: `Task "${t.title}" - ${t.status}`,
      agentId: t.assigned_agent_id,
      priority: t.priority,
      id: `task-${t.id}`,
    })),
    ...messages.map(m => ({
      type: 'message',
      timestamp: m.created_date,
      content: m.content,
      agentId: m.agent_id,
      senderEmail: m.sender_email,
      id: `msg-${m.id}`,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      addMessageMutation.mutate(newMessage);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Activity Log & Communication</h3>
        <span className="text-xs text-white/60">({activities.length})</span>
      </div>

      {/* Activity Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-6">
          <MessageSquare className="w-5 h-5 text-white/30 mx-auto mb-2" />
          <p className="text-white/50 text-xs">No activity yet. Start collaborating!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {activities.map(activity => {
            const agent = resolveAgent(activity.agentId) || getAgentDisplay(activity.senderEmail || activity.agentId);
            const isMessage = activity.type === 'message';
            const isTask = activity.type === 'task';

            return (
              <div
                key={activity.id}
                className={`${
                  isMessage ? 'bg-purple-900/20 border-purple-500/30' : 'bg-blue-900/20 border-blue-500/30'
                } border rounded-lg p-3 space-y-1.5`}
              >
                {/* Activity Header with DID Signal */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isMessage && <MessageSquare className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />}
                      {isTask && <Activity className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />}
                      
                      <p className="text-white text-xs font-semibold">{agent.name}</p>
                    </div>

                    {/* DID Identity Signal */}
                    {agent.classic_address && (
                      <span className="text-[10px] text-white/50 font-mono bg-white/10 rounded px-1.5 py-0.5 truncate max-w-xs">
                        {agent.classic_address.substring(0, 12)}...
                      </span>
                    )}
                  </div>

                  {isTask && (
                    <span className={`text-[10px] font-semibold flex-shrink-0 px-2 py-0.5 rounded ${
                      activity.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                      activity.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                      activity.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {activity.priority}
                    </span>
                  )}
                </div>

                {/* Activity Content */}
                <p className={`${isMessage ? 'text-purple-200' : 'text-blue-200'} text-xs leading-relaxed`}>
                  {activity.content}
                </p>

                {/* Timestamp */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-white/40 text-[10px]">
                    {new Date(activity.timestamp).toLocaleString('en-GB', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {isMessage && (
                    <span className="text-[10px] text-purple-300/60">💬 Comment</span>
                  )}
                  {isTask && (
                    <span className="text-[10px] text-blue-300/60">📋 Task Update</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Communication Input */}
      <div className="border-t border-white/10 pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-purple-300" />
          <label className="text-xs text-white/60 uppercase tracking-wide">Add Comment</label>
        </div>

        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Share an update or insight about this project..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none h-16"
          />
          <Button
            onClick={handleSendMessage}
            disabled={addMessageMutation.isPending || !newMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white h-auto"
          >
            {addMessageMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Transparency Notice */}
      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-2.5 flex items-start gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-indigo-300/80 text-[10px] leading-relaxed">
          Every message and action is attributed to a sovereign DID identity. This transparency ensures accountability and honors <span className="font-semibold">Law 1: Soul</span> and <span className="font-semibold">Law 2: Honour</span> in all project collaboration.
        </p>
      </div>
    </div>
  );
}