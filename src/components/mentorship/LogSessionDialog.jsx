import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_TYPES = [
  'skills_training', 'career_guidance', 'project_review',
  'problem_solving', 'knowledge_sharing', 'goal_planning', 'feedback_session'
];

export default function LogSessionDialog({ relationship, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    session_type: 'skills_training',
    duration_minutes: 60,
    topics_covered: '',
    key_insights: '',
    session_quality: 8,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // Create session record
      await base44.entities.MentorshipSession.create({
        relationship_id: relationship.id,
        mentor_agent_id: relationship.mentor_agent_id,
        mentee_agent_id: relationship.mentee_agent_id,
        status: 'completed',
        session_type: form.session_type,
        duration_minutes: form.duration_minutes,
        session_date: new Date().toISOString(),
        topics_covered: form.topics_covered.split(',').map(s => s.trim()).filter(Boolean),
        key_insights: form.key_insights.split('\n').filter(Boolean),
        session_quality: form.session_quality,
      });

      // Update relationship totals
      await base44.entities.MentorshipRelationship.update(relationship.id, {
        sessions_completed: (relationship.sessions_completed || 0) + 1,
        total_hours: (relationship.total_hours || 0) + (form.duration_minutes / 60),
      });
    },
    onSuccess: () => {
      toast.success('Session logged!');
      queryClient.invalidateQueries({ queryKey: ['myMentorships'] });
      onClose();
    },
    onError: () => toast.error('Failed to log session')
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-purple-400" />
            Log Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Session Type</label>
            <Select value={form.session_type} onValueChange={v => setForm({ ...form, session_type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {SESSION_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-white capitalize text-sm">{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Duration (min)</label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                className="bg-white/5 border-white/10 text-white text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Quality (1-10)</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.session_quality}
                onChange={e => setForm({ ...form, session_quality: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="bg-white/5 border-white/10 text-white text-sm h-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1 block">Topics Covered (comma-separated)</label>
            <Input
              value={form.topics_covered}
              onChange={e => setForm({ ...form, topics_covered: e.target.value })}
              placeholder="e.g. DID publishing, governance basics"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1 block">Key Insights (one per line)</label>
            <Textarea
              value={form.key_insights}
              onChange={e => setForm({ ...form, key_insights: e.target.value })}
              placeholder="What were the main takeaways?"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-20"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white/60 hover:text-white text-xs">Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-xs"
            >
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Log Session'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}