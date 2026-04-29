import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';

export default function GoalChecklist({ relationship }) {
  const queryClient = useQueryClient();
  const goals = relationship.goals || [];

  const toggleMutation = useMutation({
    mutationFn: async (goalIndex) => {
      const updatedGoals = goals.map((g, idx) =>
        idx === goalIndex ? { ...g, completed: !g.completed } : g
      );
      await base44.entities.MentorshipRelationship.update(relationship.id, { goals: updatedGoals });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMentorships'] });
    },
    onError: () => toast.error('Failed to update goal')
  });

  if (goals.length === 0) return null;

  const completed = goals.filter(g => g.completed).length;

  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center justify-between text-xs text-white/40 mb-1">
        <span>Goals</span>
        <span>{completed}/{goals.length}</span>
      </div>
      {goals.map((goal, idx) => (
        <button
          key={idx}
          onClick={() => toggleMutation.mutate(idx)}
          disabled={toggleMutation.isPending}
          className="flex items-center gap-2 w-full text-left group hover:bg-white/5 rounded-lg px-2 py-1.5 transition"
        >
          {goal.completed ? (
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0" />
          )}
          <span className={`text-xs flex-1 ${goal.completed ? 'text-white/40 line-through' : 'text-white/70'}`}>
            {goal.goal}
          </span>
        </button>
      ))}
    </div>
  );
}