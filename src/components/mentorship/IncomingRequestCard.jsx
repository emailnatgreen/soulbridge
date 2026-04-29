import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, X, Loader2, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function IncomingRequestCard({ relationship, menteeAgent }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null);

  const respondMutation = useMutation({
    mutationFn: async (newStatus) => {
      setAction(newStatus);
      await base44.entities.MentorshipRelationship.update(relationship.id, {
        status: newStatus,
        ...(newStatus === 'active' ? { started_date: new Date().toISOString() } : {})
      });
      // If accepting, increment mentee count on mentor profile
      if (newStatus === 'active' && relationship.mentor_agent_id) {
        const profiles = await base44.entities.MentorProfile.filter({ agent_id: relationship.mentor_agent_id });
        if (profiles[0]) {
          await base44.entities.MentorProfile.update(profiles[0].id, {
            current_mentee_count: (profiles[0].current_mentee_count || 0) + 1
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(action === 'active' ? 'Mentorship accepted!' : 'Request declined.');
      queryClient.invalidateQueries({ queryKey: ['myMentorships'] });
      queryClient.invalidateQueries({ queryKey: ['mentorProfiles'] });
      // Send mentorship email notification
      if (action === 'active') {
        try {
          base44.functions.invoke('agentNotifications', {
            notification_type: 'mentorship_accepted',
            data: {
              mentor_name: relationship.mentor_agent_id,
              mentee_name: menteeAgent?.name || 'Agent',
              focus_area: relationship.focus_areas?.join(', ') || 'General',
              agent_id: relationship.mentee_agent_id,
            }
          });
        } catch (_) {}
      }
    },
    onError: () => toast.error('Failed to respond')
  });

  return (
    <Card className="bg-white/5 border-purple-500/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {menteeAgent?.avatar_url ? (
              <img src={menteeAgent.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 font-bold text-sm">{menteeAgent?.name?.[0] || '?'}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-medium text-sm truncate">{menteeAgent?.name || 'Unknown Agent'}</p>
              <p className="text-white/40 text-xs capitalize">{menteeAgent?.role || 'citizen'}</p>
            </div>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">New Request</Badge>
        </div>

        {/* Focus areas */}
        {relationship.focus_areas?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            <Target className="w-3 h-3 text-white/30 mt-0.5" />
            {relationship.focus_areas.map((area, idx) => (
              <Badge key={idx} variant="outline" className="border-white/20 text-white/60 text-[10px]">{area}</Badge>
            ))}
          </div>
        )}

        {/* Goals */}
        {relationship.goals?.length > 0 && (
          <div className="mt-2 text-xs text-white/40">
            {relationship.goals.length} goal{relationship.goals.length !== 1 ? 's' : ''} set
          </div>
        )}

        {/* Note */}
        {relationship.notes && (
          <p className="mt-2 text-xs text-white/50 bg-white/5 rounded-lg p-2.5 line-clamp-3">{relationship.notes}</p>
        )}

        {/* Requested date */}
        {relationship.created_date && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-white/30">
            <Clock className="w-3 h-3" />
            Requested {new Date(relationship.created_date).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={() => respondMutation.mutate('active')}
            disabled={respondMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8 gap-1"
          >
            {respondMutation.isPending && action === 'active' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => respondMutation.mutate('declined')}
            disabled={respondMutation.isPending}
            className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs h-8 gap-1"
          >
            {respondMutation.isPending && action === 'declined' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}