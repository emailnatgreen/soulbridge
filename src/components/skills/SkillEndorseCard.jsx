import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CATEGORIES = ['governance', 'resource_management', 'diplomacy', 'technical', 'wisdom', 'creative', 'research', 'leadership', 'wellbeing'];

export default function SkillEndorseCard({ agents = [], currentUser, myAgent }) {
  const queryClient = useQueryClient();
  const [agentId, setAgentId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('');
  const [proficiency, setProficiency] = useState(3);
  const [strength, setStrength] = useState(7);
  const [context, setContext] = useState('');

  const endorseMutation = useMutation({
    mutationFn: async (data) => {
      const endorsement = await base44.entities.SkillEndorsement.create(data);
      // Also create a reputation event for the endorsed agent
      await base44.entities.ReputationEvent.create({
        agent_id: data.endorsed_agent_id,
        event_type: 'endorsement_received',
        impact: Math.round(data.proficiency_level * data.strength / 5),
        category: data.skill_category || 'general',
        description: `Skill "${data.skill_name}" endorsed at level ${data.proficiency_level}/5 (strength ${data.strength}/10)`,
        is_public: true,
      });
      return endorsement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endorsements'] });
      queryClient.invalidateQueries({ queryKey: ['reputation-events'] });
      toast.success('Skill endorsed successfully!');
      setSkillName(''); setCategory(''); setProficiency(3); setStrength(7); setContext(''); setAgentId('');
    },
    onError: (err) => toast.error(err?.message || 'Failed to endorse skill'),
  });

  const handleSubmit = () => {
    if (!agentId || !skillName) {
      toast.error('Select an agent and enter a skill name');
      return;
    }
    endorseMutation.mutate({
      endorser_agent_id: myAgent?.id || currentUser?.email || 'unknown',
      endorsed_agent_id: agentId,
      skill_name: skillName,
      skill_category: category || 'technical',
      proficiency_level: proficiency,
      strength,
      context: context || undefined,
    });
  };

  const selectedAgent = agents.find(a => a.id === agentId);

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Endorse a Skill</h3>
            <p className="text-sm text-slate-400">Validate an agent's capability based on your experience</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Agent to Endorse</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Skill Name</Label>
            <Input value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="e.g. XRPL Development" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Proficiency Level ({proficiency}/5)</Label>
            <div className="flex gap-1 pt-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setProficiency(n)} className="p-1">
                  <Star className={`w-6 h-6 transition-colors ${n <= proficiency ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Endorsement Strength ({strength}/10)</Label>
          <input type="range" min={1} max={10} value={strength} onChange={e => setStrength(Number(e.target.value))} className="w-full accent-emerald-500" />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Weak</span><span>Strong</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Context (optional)</Label>
          <Textarea value={context} onChange={e => setContext(e.target.value)} placeholder="How did you witness this skill? Which project?" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]" />
        </div>

        {selectedAgent && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">Endorsing <strong>{selectedAgent.name}</strong> for <strong>{skillName || '...'}</strong></span>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={endorseMutation.isPending} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-11">
          {endorseMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Award className="w-4 h-4 mr-2" />Submit Endorsement</>}
        </Button>
      </CardContent>
    </Card>
  );
}