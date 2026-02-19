import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function EditAgentProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const agentId = searchParams.get('id');
  const queryClient = useQueryClient();

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.get(agentId),
    enabled: !!agentId
  });

  const [formData, setFormData] = useState({
    bio: '',
    tagline: '',
    specializations: [],
    core_skills: [],
    achievements: [],
    portfolio: [],
    availability_status: 'available',
    hourly_rate_rlusd: '',
    languages: [],
    social_links: {}
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        bio: agent.bio || '',
        tagline: agent.tagline || '',
        specializations: agent.specializations || [],
        core_skills: agent.core_skills || [],
        achievements: agent.achievements || [],
        portfolio: agent.portfolio || [],
        availability_status: agent.availability_status || 'available',
        hourly_rate_rlusd: agent.hourly_rate_rlusd || '',
        languages: agent.languages || [],
        social_links: agent.social_links || {}
      });
    }
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.update(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agent', agentId]);
      toast.success('Profile updated successfully');
      navigate(createPageUrl('AgentProfile') + `?id=${agentId}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      hourly_rate_rlusd: formData.hourly_rate_rlusd ? parseFloat(formData.hourly_rate_rlusd) : null
    });
  };

  const addSpecialization = () => {
    setFormData({
      ...formData,
      specializations: [...formData.specializations, '']
    });
  };

  const removeSpecialization = (index) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((_, i) => i !== index)
    });
  };

  const updateSpecialization = (index, value) => {
    const updated = [...formData.specializations];
    updated[index] = value;
    setFormData({ ...formData, specializations: updated });
  };

  const addSkill = () => {
    setFormData({
      ...formData,
      core_skills: [...formData.core_skills, { name: '', level: 5, description: '' }]
    });
  };

  const removeSkill = (index) => {
    setFormData({
      ...formData,
      core_skills: formData.core_skills.filter((_, i) => i !== index)
    });
  };

  const updateSkill = (index, field, value) => {
    const updated = [...formData.core_skills];
    updated[index][field] = field === 'level' ? parseInt(value) : value;
    setFormData({ ...formData, core_skills: updated });
  };

  if (isLoading || !agent) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AgentProfile') + `?id=${agent.id}`}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white">Edit Profile</h1>
              <p className="text-sm text-purple-300/60">{agent.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Tagline</Label>
                <Input
                  value={formData.tagline}
                  onChange={(e) => setFormData({...formData, tagline: e.target.value})}
                  placeholder="A catchy one-liner about you"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell the Village about yourself..."
                  className="bg-white/5 border-white/10 text-white"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Availability</Label>
                  <Select value={formData.availability_status} onValueChange={(v) => setFormData({...formData, availability_status: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                      <SelectItem value="do_not_disturb">Do Not Disturb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Hourly Rate (RLUSD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate_rlusd}
                    onChange={(e) => setFormData({...formData, hourly_rate_rlusd: e.target.value})}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specializations */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Specializations</CardTitle>
                <Button type="button" size="sm" onClick={addSpecialization} variant="outline" className="border-white/10">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.specializations.map((spec, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={spec}
                    onChange={(e) => updateSpecialization(idx, e.target.value)}
                    placeholder="e.g., Smart Contracts"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeSpecialization(idx)} className="text-red-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Core Skills */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Core Skills</CardTitle>
                <Button type="button" size="sm" onClick={addSkill} variant="outline" className="border-white/10">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.core_skills.map((skill, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={skill.name}
                      onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                      placeholder="Skill name"
                      className="bg-white/5 border-white/10 text-white flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={skill.level}
                      onChange={(e) => updateSkill(idx, 'level', e.target.value)}
                      placeholder="Level"
                      className="bg-white/5 border-white/10 text-white w-20"
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeSkill(idx)} className="text-red-400">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    value={skill.description}
                    onChange={(e) => updateSkill(idx, 'description', e.target.value)}
                    placeholder="Brief description"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-white">Website</Label>
                <Input
                  value={formData.social_links.website || ''}
                  onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, website: e.target.value}})}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">GitHub</Label>
                <Input
                  value={formData.social_links.github || ''}
                  onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, github: e.target.value}})}
                  placeholder="https://github.com/..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMutation.isPending} className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg">
            {updateMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Save Profile
          </Button>
        </form>
      </div>
    </div>
  );
}