import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sun, Sunset, Moon, Clock, CheckCircle2, X, Loader2, MessageSquarePlus, Star } from 'lucide-react';
import SessionFeedbackModal from '@/components/SessionFeedbackModal';

const SLOT_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon };
const STATUS_CONFIG = {
  requested:  { label: 'Requested',  color: 'bg-yellow-100 text-yellow-800' },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-100 text-blue-800' },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelled',  color: 'bg-slate-100 text-slate-600' }
};

export default function SessionsList({ relationship, isMentor }) {
  const queryClient = useQueryClient();
  const [feedbackSession, setFeedbackSession] = useState(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', relationship.id],
    queryFn: () => base44.entities.MentorshipSession.filter({ relationship_id: relationship.id }, '-created_date')
  });

  const confirmMutation = useMutation({
    mutationFn: (sessionId) => base44.entities.MentorshipSession.update(sessionId, { status: 'confirmed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', relationship.id] })
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId) => base44.entities.MentorshipSession.update(sessionId, {
      status: 'completed',
      session_date: new Date().toISOString()
    }),
    onSuccess: async (_, sessionId) => {
      // Also increment relationship counters
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        await base44.entities.MentorshipRelationship.update(relationship.id, {
          sessions_completed: (relationship.sessions_completed || 0) + 1,
          total_hours: (relationship.total_hours || 0) + (session.duration_minutes || 60) / 60
        });
      }
      queryClient.invalidateQueries({ queryKey: ['sessions', relationship.id] });
      queryClient.invalidateQueries({ queryKey: ['activeMentorships'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId) => base44.entities.MentorshipSession.update(sessionId, { status: 'cancelled' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', relationship.id] })
  });

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>;
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        No sessions yet. {!isMentor ? 'Book your first session above!' : 'Waiting for your mentee to book a session.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map(session => {
        const SlotIcon = SLOT_ICONS[session.requested_slot] || Clock;
        const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.requested;

        return (
          <div key={session.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 mt-0.5">
              <SlotIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-800">
                  {session.requested_day && session.requested_slot
                    ? `${session.requested_day} – ${session.requested_slot.charAt(0).toUpperCase() + session.requested_slot.slice(1)}`
                    : 'General Request'}
                </span>
                <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                {session.session_type && (
                  <span className="text-xs text-slate-400">
                    {session.session_type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {session.mentee_notes && (
                <p className="text-xs text-slate-500 mt-1 truncate">{session.mentee_notes}</p>
              )}
            </div>

            {/* Mentor actions */}
            {isMentor && session.status === 'requested' && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => confirmMutation.mutate(session.id)}
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-400 hover:text-red-600"
                  onClick={() => cancelMutation.mutate(session.id)}
                  disabled={cancelMutation.isPending}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Mark complete (mentor only, confirmed sessions) */}
            {isMentor && session.status === 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs flex-shrink-0"
                onClick={() => completeMutation.mutate(session.id)}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Button>
            )}

            {/* Leave feedback on completed sessions */}
            {session.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs flex-shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                onClick={() => setFeedbackSession(session)}
              >
                {(isMentor ? session.session_quality : session.session_quality) ? (
                  <><Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" /> Rated</>
                ) : (
                  <><MessageSquarePlus className="w-3 h-3 mr-1" /> Feedback</>
                )}
              </Button>
            )}
          </div>
        );
      })}

      {feedbackSession && (
        <SessionFeedbackModal
          open={!!feedbackSession}
          onClose={() => setFeedbackSession(null)}
          session={feedbackSession}
          relationship={relationship}
          isMentor={isMentor}
        />
      )}
    </div>
  );
}