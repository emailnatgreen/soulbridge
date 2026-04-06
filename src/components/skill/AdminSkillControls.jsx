import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Plus, Zap, BookOpen, ShieldCheck, Loader2, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { useIdentity } from '@/hooks/useIdentity';

const SKILL_CATEGORIES = [
  'governance', 'resource_management', 'diplomacy', 'technical',
  'wisdom', 'combat', 'creative', 'research', 'leadership', 'wellbeing'
];

export default function AdminSkillControls({ selectedAgent, agents }) {
  const { isAdmin } = useIdentity();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState(null);
  const [newSkill, setNewSkill] = useState({ name: '', category: 'technical', description: '' });
  const [assignTraining, setAssignTraining] = useState({ title: '', skill_focus: '', training_type: 'skill_development' });
  const [overrideData, setOverrideData] = useState({ skill_name: '', new_score: '' });

  if (!isAdmin) return null;

  const createSkillMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent?.id) throw new Error('Select an agent first');
      await base44.entities.AgentSkill.create({
        agent_id: selectedAgent.id,
        skill_id: newSkill.name.toLowerCase().replace(/\s+/g, '_'),
        skill_category: newSkill.category,
        skill_name: newSkill.name,
        skill_description: newSkill.description,
        level: 1, max_level: 10, proficiency_score: 0,
        skill_growth_trajectory: 'stable',
        unlocked_at: new Date().toISOString(),
      });
      await base44.entities.Skill.create({
        name: newSkill.name, description: newSkill.description, category: newSkill.category, level: 'novice',
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-skills']);
      queryClient.invalidateQueries(['allAgentSkills']);
      toast.success(`Skill "${newSkill.name}" created for ${selectedAgent?.name}`);
      setNewSkill({ name: '', category: 'technical', description: '' });
      setActiveAction(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const assignTrainingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent?.id) throw new Error('Select an agent first');
      await base44.entities.AgentTraining.create({
        agent_id: selectedAgent.id,
        training_type: assignTraining.training_type,
        skill_focus: assignTraining.skill_focus,
        title: assignTraining.title,
        description: `Assigned by Axi (Admin) for ${selectedAgent.name}`,
        status: 'not_started',
        recommended_by: 'axi',
        progress: { completion_percentage: 0, lessons_completed: 0, exercises_completed: 0, time_spent_minutes: 0 },
        rewards: { experience_gained: 25, wisdom_gained: 5, honor_gained: 3 },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skill-progress']);
      toast.success(`Training "${assignTraining.title}" assigned to ${selectedAgent?.name}`);
      setAssignTraining({ title: '', skill_focus: '', training_type: 'skill_development' });
      setActiveAction(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const overrideProficiencyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent?.id) throw new Error('Select an agent first');
      const skills = await base44.entities.AgentSkill.filter({ agent_id: selectedAgent.id });
      const skill = skills.find(s =>
        s.skill_name?.toLowerCase() === overrideData.skill_name.toLowerCase() ||
        s.skill_id?.toLowerCase() === overrideData.skill_name.toLowerCase()
      );
      if (!skill) throw new Error(`Skill "${overrideData.skill_name}" not found for this agent`);
      const score = parseInt(overrideData.new_score);
      if (isNaN(score) || score < 0 || score > 100) throw new Error('Score must be 0-100');
      await base44.entities.AgentSkill.update(skill.id, {
        proficiency_score: score, last_upgraded: new Date().toISOString(),
      });
      await base44.entities.AutomationLog.create({
        automation_name: 'axi_proficiency_override', status: 'completed',
        message: `Axi overrode proficiency for ${selectedAgent.name}'s skill "${skill.skill_name}" to ${score}%`,
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-skills']);
      toast.success(`Proficiency overridden for "${overrideData.skill_name}"`);
      setOverrideData({ skill_name: '', new_score: '' });
      setActiveAction(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent?.id) throw new Error('Select an agent first');
      return base44.functions.invoke('updateAgentSkillProfile', { agent_id: selectedAgent.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-skills']);
      toast.success('Skill profile synced from endorsements, training & credentials');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="bg-amber-500/5 border-amber-500/20 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Axi Admin Controls
          <Badge className="bg-amber-500/20 text-amber-200 text-[10px]">Mother Boss</Badge>
        </CardTitle>
        {selectedAgent && (
          <div className="flex items-center gap-1.5 mt-1">
            <Fingerprint className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-white/40 font-mono">
              {selectedAgent.classic_address
                ? `${selectedAgent.classic_address.slice(0, 8)}...${selectedAgent.classic_address.slice(-6)}`
                : 'No DID'}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={activeAction === 'create-skill' ? 'default' : 'outline'}
            className="text-xs border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => setActiveAction(activeAction === 'create-skill' ? null : 'create-skill')}>
            <Plus className="w-3 h-3 mr-1" />Create Skill
          </Button>
          <Button size="sm" variant={activeAction === 'assign-training' ? 'default' : 'outline'}
            className="text-xs border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => setActiveAction(activeAction === 'assign-training' ? null : 'assign-training')}>
            <BookOpen className="w-3 h-3 mr-1" />Assign Training
          </Button>
          <Button size="sm" variant={activeAction === 'override' ? 'default' : 'outline'}
            className="text-xs border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => setActiveAction(activeAction === 'override' ? null : 'override')}>
            <Zap className="w-3 h-3 mr-1" />Override Proficiency
          </Button>
          <Button size="sm" variant="outline"
            className="text-xs border-emerald-500/30 hover:bg-emerald-500/10"
            disabled={syncAllMutation.isPending}
            onClick={() => syncAllMutation.mutate()}>
            {syncAllMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
            Sync Profile
          </Button>
        </div>

        {activeAction === 'create-skill' && (
          <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/60 font-medium">Create New AgentSkill</p>
            <Input placeholder="Skill name" value={newSkill.name}
              onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm h-8" />
            <Select value={newSkill.category} onValueChange={v => setNewSkill(s => ({ ...s, category: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {SKILL_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Description" value={newSkill.description}
              onChange={e => setNewSkill(s => ({ ...s, description: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm h-8" />
            <Button size="sm" onClick={() => createSkillMutation.mutate()}
              disabled={createSkillMutation.isPending || !newSkill.name}
              className="bg-amber-600 hover:bg-amber-700 text-xs">
              {createSkillMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
              Create Skill for {selectedAgent?.name || 'Agent'}
            </Button>
          </div>
        )}

        {activeAction === 'assign-training' && (
          <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/60 font-medium">Assign Training Module</p>
            <Input placeholder="Training title" value={assignTraining.title}
              onChange={e => setAssignTraining(s => ({ ...s, title: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm h-8" />
            <Input placeholder="Skill focus (e.g. governance_voting)" value={assignTraining.skill_focus}
              onChange={e => setAssignTraining(s => ({ ...s, skill_focus: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm h-8" />
            <Select value={assignTraining.training_type}
              onValueChange={v => setAssignTraining(s => ({ ...s, training_type: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {['skill_development', 'role_preparation', 'wisdom_cultivation', 'governance_training', 'creative_arts'].map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => assignTrainingMutation.mutate()}
              disabled={assignTrainingMutation.isPending || !assignTraining.title}
              className="bg-amber-600 hover:bg-amber-700 text-xs">
              {assignTrainingMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BookOpen className="w-3 h-3 mr-1" />}
              Assign to {selectedAgent?.name || 'Agent'}
            </Button>
          </div>
        )}

        {activeAction === 'override' && (
          <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/60 font-medium">Override Proficiency Score</p>
            <p className="text-[10px] text-amber-400/60">⚠ Logged to AutomationLog for transparency (Law 2: Honour)</p>
            <Input placeholder="Skill name (exact match)" value={overrideData.skill_name}
              onChange={e => setOverrideData(s => ({ ...s, skill_name: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm h-8" />
            <Input placeholder="New score (0-100)" type="number" value={overrideData.new_score}
              onChange={e => setOverrideData(s => ({ ...s, new_score: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm h-8" />
            <Button size="sm" onClick={() => overrideProficiencyMutation.mutate()}
              disabled={overrideProficiencyMutation.isPending || !overrideData.skill_name || !overrideData.new_score}
              className="bg-red-600 hover:bg-red-700 text-xs">
              {overrideProficiencyMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
              Override & Log
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}