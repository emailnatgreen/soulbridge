import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_TYPES = ['open_chat', 'broadcast_wisdom', 'trigger_alert'];

export default function DirectActionInterface() {
  const [action, setAction] = useState('open_chat');
  const [agentId, setAgentId] = useState('axi');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateDecision = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.JukeboxDecision.create({
        action,
        agent_id: agentId,
        message: message.trim(),
        status: 'pending',
        triggered_by: 'axi_command_interface',
      });

      toast.success('Decision created and queued');
      setMessage('');
      setAction('open_chat');
      setAgentId('axi');
    } catch (error) {
      console.error('Error creating decision:', error);
      toast.error('Failed to create decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white mb-4">Create Intervention</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Action Type</label>
          <Select value={action} onValueChange={setAction} disabled={submitting}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="text-xs">
                  {type.replace(/_/g, ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Target Agent</label>
          <Input
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            disabled={submitting}
            placeholder="axi or agent_id"
            className="bg-slate-700/50 border-slate-600 text-white text-xs h-8"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Message / Context</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
            placeholder="Describe the action or context..."
            className="bg-slate-700/50 border-slate-600 text-white text-xs min-h-[80px] resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleCreateDecision}
            disabled={submitting || !message.trim()}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                Create Decision
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              setMessage('');
              setAction('open_chat');
              setAgentId('axi');
            }}
            disabled={submitting}
            variant="outline"
            className="border-slate-600 text-slate-300 text-xs h-8"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Tip:</span> Use this interface to manually trigger
          Jukebox Decisions when you need to intervene directly. Decisions are processed asynchronously.
        </p>
      </div>
    </div>
  );
}