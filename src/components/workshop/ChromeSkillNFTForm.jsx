import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Chrome, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_SKILL = { skill_name: '', instructions: '', trigger_command: '', requires_didit_verification: true };

export default function ChromeSkillNFTForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [skills, setSkills] = useState([{ ...EMPTY_SKILL }]);
  const queryClient = useQueryClient();

  const updateSkill = (idx, key, val) => {
    setSkills(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  };
  const addSkill = () => setSkills(prev => [...prev, { ...EMPTY_SKILL }]);
  const removeSkill = (idx) => setSkills(prev => prev.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Widget.create({
        name,
        description,
        image_url: imageUrl,
        widget_type: 'unlock',
        widget_class: 'unlock',
        category: 'skill',
        ui_behavior: 'activate_feature',
        version: '1.0.0',
        minted_by: user.email,
        creator_id: user.email,
        mint_status: 'draft',
        metadata_version: '1.0.0',
        chrome_skill_instructions: skills.filter(s => s.skill_name && s.instructions),
      });
    },
    onSuccess: () => {
      toast.success('Chrome Skill NFT created as draft');
      setName(''); setDescription(''); setImageUrl('');
      setSkills([{ ...EMPTY_SKILL }]);
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
    },
  });

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Chrome className="w-4 h-4 text-emerald-400" /> Create Chrome Skill NFT</CardTitle>
        <CardDescription className="text-white/40 text-xs">
          A Widget NFT that embeds Chrome Gemini Side Panel skill instructions. Owning this NFT activates the skill in your browser agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">NFT Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Axi Pharmacy Unlock" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Image URL</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Description *</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What Chrome skill does this NFT unlock?" className="bg-white/5 border-white/10 text-white min-h-[60px]" />
        </div>

        {/* Skill definitions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-emerald-300 text-xs font-semibold">Chrome Skill Definitions</Label>
            <Button variant="ghost" size="sm" onClick={addSkill} className="text-emerald-400 hover:text-emerald-300 gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> Add Skill
            </Button>
          </div>
          {skills.map((skill, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 text-[10px] font-mono">Skill #{idx + 1}</span>
                {skills.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeSkill(idx)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white/50 text-[10px]">Skill Name *</Label>
                  <Input value={skill.skill_name} onChange={e => updateSkill(idx, 'skill_name', e.target.value)} placeholder="Axi Pharmacy Unlock" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-[10px]">Trigger Command</Label>
                  <Input value={skill.trigger_command} onChange={e => updateSkill(idx, 'trigger_command', e.target.value)} placeholder="/Axi" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-[10px]">Instructions *</Label>
                <Textarea value={skill.instructions} onChange={e => updateSkill(idx, 'instructions', e.target.value)} placeholder="Natural language instructions for the browser agent…" className="bg-white/5 border-white/10 text-white text-xs min-h-[60px]" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={skill.requires_didit_verification} onCheckedChange={v => updateSkill(idx, 'requires_didit_verification', v)} />
                <Label className="text-white/50 text-[10px]">Require DIDit verification + RLUSD payment</Label>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={() => mutation.mutate()} disabled={!name || !description || skills.every(s => !s.skill_name) || mutation.isPending} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 w-full sm:w-auto">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
          Create Chrome Skill NFT Draft
        </Button>
      </CardContent>
    </Card>
  );
}