import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sun, Sunset, Moon, CalendarDays, Loader2, CheckCircle2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOT_CONFIG = {
  morning:   { label: 'Morning',   time: '6am–12pm',  icon: Sun,    color: 'bg-yellow-100 border-yellow-400 text-yellow-900' },
  afternoon: { label: 'Afternoon', time: '12pm–6pm',  icon: Sunset, color: 'bg-orange-100 border-orange-400 text-orange-900' },
  evening:   { label: 'Evening',   time: '6pm–10pm',  icon: Moon,   color: 'bg-indigo-100 border-indigo-400 text-indigo-900' }
};

const SESSION_TYPES = [
  { value: 'skills_training',   label: 'Skills Training' },
  { value: 'career_guidance',   label: 'Career Guidance' },
  { value: 'project_review',    label: 'Project Review' },
  { value: 'problem_solving',   label: 'Problem Solving' },
  { value: 'knowledge_sharing', label: 'Knowledge Sharing' },
  { value: 'goal_planning',     label: 'Goal Planning' },
  { value: 'feedback_session',  label: 'Feedback Session' }
];

export default function BookSessionModal({ open, onClose, relationship, mentorAgent, menteeAgent }) {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [sessionType, setSessionType] = useState('skills_training');
  const [notes, setNotes] = useState('');
  const [booked, setBooked] = useState(false);

  // Fetch mentor profile to get availability
  const { data: mentorProfile } = useQuery({
    queryKey: ['mentorProfile', mentorAgent?.id],
    queryFn: () => base44.entities.MentorProfile.filter({ agent_id: mentorAgent.id }),
    enabled: !!mentorAgent?.id,
    select: (data) => data[0]
  });

  const availabilitySchedule = mentorProfile?.availability_schedule || [];

  const getAvailableSlots = (day) => {
    const entry = availabilitySchedule.find(e => e.day === day);
    return entry ? entry.slots : [];
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.MentorshipSession.create({
        relationship_id: relationship.id,
        mentor_agent_id: relationship.mentor_agent_id,
        mentee_agent_id: relationship.mentee_agent_id,
        status: 'requested',
        requested_day: selectedDay,
        requested_slot: selectedSlot,
        session_type: sessionType,
        mentee_notes: notes,
        duration_minutes: 60
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', relationship.id] });
      setBooked(true);
    }
  });

  const handleClose = () => {
    setSelectedDay(null);
    setSelectedSlot(null);
    setNotes('');
    setBooked(false);
    onClose();
  };

  const availableDays = DAYS.filter(day => getAvailableSlots(day).length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Book a Session with {mentorAgent?.name}
          </DialogTitle>
          <DialogDescription>
            Select an available time slot and describe what you'd like to work on.
          </DialogDescription>
        </DialogHeader>

        {booked ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900">Session Requested!</h3>
            <p className="text-slate-600 mt-1 text-sm">
              Your request for a {selectedSlot} session on {selectedDay} has been sent to {mentorAgent?.name}.
            </p>
            <Button onClick={handleClose} className="mt-6">Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mentor Availability */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-3 block">
                {mentorAgent?.name}'s Available Slots
                {mentorProfile?.timezone && (
                  <span className="text-slate-400 font-normal ml-2">({mentorProfile.timezone})</span>
                )}
              </label>

              {availableDays.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
                  This mentor hasn't set their availability yet. You can still send a general session request below.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableDays.map(day => {
                    const slots = getAvailableSlots(day);
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <span className={`w-24 text-sm font-medium ${selectedDay === day ? 'text-blue-700' : 'text-slate-600'}`}>
                          {day.slice(0, 3)}
                        </span>
                        <div className="flex gap-2 flex-1">
                          {slots.map(slot => {
                            const cfg = SLOT_CONFIG[slot];
                            const Icon = cfg.icon;
                            const isSelected = selectedDay === day && selectedSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => { setSelectedDay(day); setSelectedSlot(slot); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  isSelected
                                    ? cfg.color + ' ring-2 ring-offset-1 ring-blue-400'
                                    : cfg.color + ' opacity-60 hover:opacity-100'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Session Type */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Session Type</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                What would you like to cover?
              </label>
              <Textarea
                placeholder="Describe your goals for this session, questions you have, or topics you'd like to explore..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Selected summary */}
            {selectedDay && selectedSlot && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                Requesting: <strong>{selectedDay} {SLOT_CONFIG[selectedSlot].label}</strong> ({SLOT_CONFIG[selectedSlot].time})
              </div>
            )}

            <Button
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending}
              className="w-full"
            >
              {bookMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending Request...</>
              ) : (
                <>
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Request Session
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}