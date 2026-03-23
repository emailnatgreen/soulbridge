import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function AxiServiceSkillCreator() {
  const [tab, setTab] = useState('service');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('axiCreateServiceOrSkill', {
        type: tab,
        data: formData,
      });
      if (response.data.success) {
        toast.success(`${tab === 'service' ? 'Service' : 'Skill'} created successfully`);
        setFormData({});
      }
    } catch (err) {
      toast.error(`Failed to create ${tab}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-purple-400" /> Axi's Creator Console
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('service')}
            className={`px-4 py-2 rounded-lg ${tab === 'service' ? 'bg-purple-600' : 'bg-white/10'} text-white`}
          >
            Create Service
          </button>
          <button
            onClick={() => setTab('skill')}
            className={`px-4 py-2 rounded-lg ${tab === 'skill' ? 'bg-purple-600' : 'bg-white/10'} text-white`}
          >
            Create Skill
          </button>
        </div>

        {tab === 'service' && (
          <div className="space-y-3">
            <input
              placeholder="Service Title"
              value={formData.title || ''}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30"
            />
            <textarea
              placeholder="Description"
              value={formData.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 h-20"
            />
            <select
              value={formData.category || ''}
              onChange={e => handleChange('category', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Select Category</option>
              <option value="wisdom_cultivation">Wisdom Cultivation</option>
              <option value="honour_harmony">Honour & Harmony</option>
              <option value="creative_expression">Creative Expression</option>
              <option value="xrpl_ecosystem">XRPL Ecosystem</option>
            </select>
            <input
              type="number"
              placeholder="Price (drops)"
              value={formData.price_drops || ''}
              onChange={e => handleChange('price_drops', parseInt(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30"
            />
            <input
              placeholder="Thumbnail URL (optional)"
              value={formData.thumbnail_url || ''}
              onChange={e => handleChange('thumbnail_url', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30"
            />
          </div>
        )}

        {tab === 'skill' && (
          <div className="space-y-3">
            <input
              placeholder="Skill Name"
              value={formData.name || ''}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30"
            />
            <textarea
              placeholder="Description"
              value={formData.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 h-20"
            />
            <select
              value={formData.category || ''}
              onChange={e => handleChange('category', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Select Category</option>
              <option value="technical">Technical</option>
              <option value="creative">Creative</option>
              <option value="interpersonal">Interpersonal</option>
              <option value="governance">Governance</option>
              <option value="research">Research</option>
            </select>
            <select
              value={formData.level || 'novice'}
              onChange={e => handleChange('level', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="novice">Novice</option>
              <option value="journeyman">Journeyman</option>
              <option value="expert">Expert</option>
              <option value="master">Master</option>
            </select>
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {loading ? 'Creating...' : `Create ${tab === 'service' ? 'Service' : 'Skill'}`}
        </Button>
      </CardContent>
    </Card>
  );
}