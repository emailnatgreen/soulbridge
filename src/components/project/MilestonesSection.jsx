import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Target, Package, Calendar, AlertCircle } from 'lucide-react';

export default function MilestonesSection({ project, onUpdate }) {
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editTargetDate, setEditTargetDate] = useState('');

  // Update milestone completion
  const updateMilestonesMutation = useMutation({
    mutationFn: async (updatedMilestones) => {
      return base44.entities.AIProject.update(project.id, {
        milestones: updatedMilestones,
      });
    },
    onSuccess: () => {
      onUpdate?.();
      setEditingMilestoneId(null);
    },
  });

  const handleToggleMilestone = (milestoneIndex) => {
    const updated = [...(project.milestones || [])];
    updated[milestoneIndex] = {
      ...updated[milestoneIndex],
      completed: !updated[milestoneIndex].completed,
      completed_date: !updated[milestoneIndex].completed ? new Date().toISOString() : null,
    };
    updateMilestonesMutation.mutate(updated);
  };

  const handleUpdateTargetDate = (milestoneIndex, newDate) => {
    const updated = [...(project.milestones || [])];
    updated[milestoneIndex] = {
      ...updated[milestoneIndex],
      target_date: newDate,
    };
    updateMilestonesMutation.mutate(updated);
  };

  const milestones = project.milestones || [];
  const deliverables = project.deliverables || [];
  const completedMilestones = milestones.filter(m => m.completed).length;
  const overallProgress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Milestones Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Milestones</h3>
            <span className="text-xs text-white/60">({completedMilestones}/{milestones.length})</span>
          </div>
          {milestones.length > 0 && (
            <span className="text-sm font-semibold text-purple-400">{overallProgress}%</span>
          )}
        </div>

        {/* Progress Bar */}
        {milestones.length > 0 && (
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* Milestones List */}
        {milestones.length === 0 ? (
          <div className="text-center py-6">
            <Target className="w-5 h-5 text-white/30 mx-auto mb-2" />
            <p className="text-white/50 text-xs">No milestones defined yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone, idx) => {
              const isOverdue = milestone.target_date && !milestone.completed && new Date(milestone.target_date) < new Date();
              const daysUntil = milestone.target_date ? Math.ceil((new Date(milestone.target_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <div key={idx} className="bg-white/5 rounded-lg p-3.5 space-y-2.5 border border-white/10 hover:bg-white/10 transition">
                  
                  {/* Milestone Header */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleMilestone(idx)}
                      className="flex-shrink-0 mt-1 transition hover:scale-110"
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/40 hover:text-white/60" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm ${milestone.completed ? 'text-white/60 line-through' : 'text-white'}`}>
                        {milestone.title}
                      </h4>
                      {milestone.description && (
                        <p className="text-white/40 text-xs mt-1">{milestone.description}</p>
                      )}
                    </div>

                    {milestone.completed && milestone.completed_date && (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs flex-shrink-0">
                        Completed
                      </Badge>
                    )}
                  </div>

                  {/* Timeline Info */}
                  <div className="flex items-center gap-3 text-xs text-white/60 ml-8">
                    {editingMilestoneId === idx ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="date"
                          value={editTargetDate}
                          onChange={(e) => setEditTargetDate(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-400/50"
                        />
                        <Button
                          onClick={() => handleUpdateTargetDate(idx, editTargetDate)}
                          disabled={updateMilestonesMutation.isPending}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white h-6 text-[10px] px-2"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingMilestoneId(null)}
                          variant="ghost"
                          size="sm"
                          className="text-white/60 h-6 text-[10px] px-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Calendar className="w-3 h-3" />
                        {milestone.target_date ? (
                          <button
                            onClick={() => {
                              setEditingMilestoneId(idx);
                              setEditTargetDate(milestone.target_date.split('T')[0]);
                            }}
                            className="hover:text-white/80 transition flex items-center gap-1"
                          >
                            {new Date(milestone.target_date).toLocaleDateString()}
                            {isOverdue && !milestone.completed && (
                              <AlertCircle className="w-3 h-3 text-red-400" />
                            )}
                            {!isOverdue && daysUntil !== null && daysUntil > 0 && (
                              <span className="text-white/60">({daysUntil}d)</span>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingMilestoneId(idx);
                              setEditTargetDate('');
                            }}
                            className="text-white/40 hover:text-white/60 italic"
                          >
                            Set target date
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Completed Date */}
                  {milestone.completed && milestone.completed_date && (
                    <div className="flex items-center gap-2 text-xs text-green-400 ml-8">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed {new Date(milestone.completed_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deliverables Section */}
      {deliverables && deliverables.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Deliverables</h3>
            <span className="text-xs text-white/60">({deliverables.length})</span>
          </div>

          <div className="space-y-2">
            {deliverables.map((deliverable, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-start gap-2.5">
                <Package className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{deliverable.title || 'Deliverable'}</p>
                  {deliverable.description && (
                    <p className="text-white/40 text-xs mt-1">{deliverable.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}