import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Edit, Save, X, Loader } from 'lucide-react';

const severityConfig = {
  Low: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: AlertCircle, bgColor: 'bg-blue-900/20' },
  Medium: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: AlertTriangle, bgColor: 'bg-yellow-900/20' },
  High: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: AlertTriangle, bgColor: 'bg-orange-900/20' },
  Critical: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertTriangle, bgColor: 'bg-red-900/20' },
};

export default function RisksSection({ project, onUpdate }) {
  const [editingRiskId, setEditingRiskId] = useState(null);
  const [editedMitigation, setEditedMitigation] = useState('');

  // Update risks mutation
  const updateRisksMutation = useMutation({
    mutationFn: async (updatedRisks) => {
      return base44.entities.AIProject.update(project.id, {
        risks: updatedRisks,
      });
    },
    onSuccess: () => {
      onUpdate?.();
      setEditingRiskId(null);
    },
  });

  const handleEditMitigation = (riskIndex) => {
    setEditingRiskId(riskIndex);
    setEditedMitigation((project.risks?.[riskIndex]?.mitigation) || '');
  };

  const handleSaveMitigation = (riskIndex) => {
    const updated = [...(project.risks || [])];
    updated[riskIndex] = {
      ...updated[riskIndex],
      mitigation: editedMitigation,
    };
    updateRisksMutation.mutate(updated);
  };

  const risks = project.risks || [];
  
  // Risk severity distribution
  const riskCounts = {
    Critical: risks.filter(r => r.severity === 'Critical').length,
    High: risks.filter(r => r.severity === 'High').length,
    Medium: risks.filter(r => r.severity === 'Medium').length,
    Low: risks.filter(r => r.severity === 'Low').length,
  };

  const highestRisk = risks.length > 0 ? 'Critical' : 'Medium';
  const hasHighRisks = riskCounts.Critical > 0 || riskCounts.High > 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Risks & Mitigation</h3>
          <span className="text-xs text-white/60">({risks.length})</span>
        </div>
        {hasHighRisks && (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
            ⚠ High Risk
          </Badge>
        )}
      </div>

      {/* Risk Distribution */}
      {risks.length > 0 && (
        <div className="grid grid-cols-4 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
          {['Critical', 'High', 'Medium', 'Low'].map(severity => (
            <div key={severity} className="text-center">
              <p className="text-xs font-semibold text-white">{riskCounts[severity]}</p>
              <p className="text-[10px] text-white/50">{severity}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risks List */}
      {risks.length === 0 ? (
        <div className="text-center py-6">
          <AlertCircle className="w-5 h-5 text-white/30 mx-auto mb-2" />
          <p className="text-white/50 text-xs">No identified risks. Great position to be in!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((risk, idx) => {
            const config = severityConfig[risk.severity] || severityConfig.Medium;
            const SeverityIcon = config.icon;

            return (
              <div key={idx} className={`${config.bgColor} border border-white/10 rounded-lg p-3.5 space-y-2.5`}>
                
                {/* Risk Header */}
                <div className="flex items-start gap-3">
                  <SeverityIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.color.split(' ')[1]}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-medium text-sm">{risk.description}</h4>
                      <Badge className={`${config.color} text-xs flex-shrink-0`}>
                        {risk.severity}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Mitigation */}
                <div className="ml-8 space-y-2">
                  <p className="text-xs text-white/60 uppercase tracking-wide">Mitigation Strategy</p>
                  
                  {editingRiskId === idx ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedMitigation}
                        onChange={(e) => setEditedMitigation(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none h-20"
                        placeholder="Describe mitigation strategy..."
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSaveMitigation(idx)}
                          disabled={updateRisksMutation.isPending}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                        >
                          {updateRisksMutation.isPending ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3 h-3" /> Save
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setEditingRiskId(null)}
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-white/60 text-xs h-7 hover:bg-white/10"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                      {risk.mitigation ? (
                        <p className="text-white/70 text-xs leading-relaxed">{risk.mitigation}</p>
                      ) : (
                        <p className="text-white/40 text-xs italic">No mitigation strategy defined yet.</p>
                      )}
                      <Button
                        onClick={() => handleEditMitigation(idx)}
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white/80 text-xs h-5 mt-2 gap-1 p-0"
                      >
                        <Edit className="w-2.5 h-2.5" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Risk Advisory */}
      {hasHighRisks && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-xs font-medium">Active Risk Mitigation Required</p>
            <p className="text-red-400/70 text-[10px] mt-1">Your project has identified high-severity risks. Review and strengthen mitigation strategies to ensure project resilience.</p>
          </div>
        </div>
      )}
    </div>
  );
}