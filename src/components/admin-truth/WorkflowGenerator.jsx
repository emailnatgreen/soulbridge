import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Workflow, Lock, ArrowRight } from 'lucide-react';
import { ADMIN_LEAF_CONFIG } from './AdminLeafEngine';

export default function WorkflowGenerator({ investigation, onGenerateWorkflow }) {
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  const [generated, setGenerated] = useState(null);

  if (!investigation || !investigation.leaves) return null;

  const toggleLeaf = (key) => {
    setSelectedLeaves(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleGenerate = () => {
    const leaves = investigation.leaves;
    const phases = [];

    // Phase 1: Critical fixes from risks
    if (selectedLeaves.includes('risk_impact') && leaves.risk_impact?.length > 0) {
      const highRisks = leaves.risk_impact.filter(r => r.severity === 'high' || r.severity === 'critical');
      if (highRisks.length > 0) {
        phases.push({
          phase: 1,
          name: 'Critical Fixes',
          tasks: highRisks.map(r => ({ title: r.title || r.description, priority: 'critical', source_leaf: 5 })),
        });
      }
    }

    // Phase 2: Hardening from contradictions + medium risks
    const hardeningTasks = [];
    if (selectedLeaves.includes('contradictions') && leaves.contradictions?.length > 0) {
      leaves.contradictions.forEach(c => hardeningTasks.push({ title: c.title || c.description || c, priority: 'high', source_leaf: 3 }));
    }
    if (selectedLeaves.includes('risk_impact') && leaves.risk_impact?.length > 0) {
      leaves.risk_impact.filter(r => r.severity === 'medium').forEach(r => hardeningTasks.push({ title: r.title || r.description, priority: 'medium', source_leaf: 5 }));
    }
    if (hardeningTasks.length > 0) phases.push({ phase: phases.length + 1, name: 'Hardening', tasks: hardeningTasks });

    // Phase 3: Actions
    if (selectedLeaves.includes('proposed_actions') && leaves.proposed_actions?.length > 0) {
      phases.push({
        phase: phases.length + 1,
        name: 'Implementation',
        tasks: leaves.proposed_actions.map(a => ({ title: a.title || a.description || a, priority: 'normal', source_leaf: 6 })),
      });
    }

    // Phase 4: Pre-publish checks from synthesis
    if (selectedLeaves.includes('synthesis') && leaves.synthesis) {
      phases.push({
        phase: phases.length + 1,
        name: 'Pre-Publish Review',
        tasks: [{ title: 'Review synthesised findings before publishing', priority: 'normal', source_leaf: 7 }],
      });
    }

    setGenerated(phases.length > 0 ? phases : [{ phase: 1, name: 'Review', tasks: [{ title: 'No actionable items found in selected leaves', priority: 'low', source_leaf: 0 }] }]);
    if (onGenerateWorkflow) onGenerateWorkflow(phases);
  };

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-violet-400 flex items-center gap-1.5">
          <Workflow className="w-3.5 h-3.5" />
          Workflow Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-white/30 text-[10px]">Select leaves to generate a build workflow from this investigation.</p>
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_LEAF_CONFIG.map(leaf => {
            const hasData = !!investigation.leaves[leaf.key] && (typeof investigation.leaves[leaf.key] === 'string' ? investigation.leaves[leaf.key].length > 0 : Array.isArray(investigation.leaves[leaf.key]) ? investigation.leaves[leaf.key].length > 0 : true);
            return (
              <label key={leaf.key} className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${hasData ? 'border-white/10 hover:bg-white/[0.03]' : 'border-white/5 opacity-30 cursor-not-allowed'}`}>
                <Checkbox
                  checked={selectedLeaves.includes(leaf.key)}
                  onCheckedChange={() => hasData && toggleLeaf(leaf.key)}
                  disabled={!hasData}
                  className="h-3.5 w-3.5"
                />
                <span className={`${leaf.color} text-[10px]`}>L{leaf.num}: {leaf.label}</span>
              </label>
            );
          })}
        </div>
        <Button onClick={handleGenerate} disabled={selectedLeaves.length === 0} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs w-full">
          <Workflow className="w-3 h-3 mr-1" /> Generate Workflow
        </Button>

        {generated && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            {generated.map(phase => (
              <div key={phase.phase} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/30">Phase {phase.phase}</Badge>
                  <span className="text-white/60 text-xs font-medium">{phase.name}</span>
                </div>
                {phase.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2 pl-4 text-[10px]">
                    <ArrowRight className="w-2.5 h-2.5 text-white/20" />
                    <span className="text-white/50">{task.title}</span>
                    <Badge className={`text-[8px] ml-auto ${task.priority === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' : task.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-white/30 border-white/10'}`}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}