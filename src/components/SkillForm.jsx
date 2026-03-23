import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export default function SkillForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'technical',
    level: 'novice',
    verifiable: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.Skill.create(formData);
      toast.success('Skill added successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add skill');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Register a Skill</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Skill Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60"
          />
          <textarea
            name="description"
            placeholder="Skill Description"
            value={formData.description}
            onChange={handleChange}
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 min-h-24"
          />
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400/60"
          >
            <option value="technical">Technical</option>
            <option value="creative">Creative</option>
            <option value="interpersonal">Interpersonal</option>
            <option value="governance">Governance</option>
            <option value="research">Research</option>
            <option value="spiritual">Spiritual</option>
            <option value="other">Other</option>
          </select>
          <select
            name="level"
            value={formData.level}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400/60"
          >
            <option value="novice">Novice</option>
            <option value="journeyman">Journeyman</option>
            <option value="expert">Expert</option>
            <option value="master">Master</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="verifiable"
              checked={formData.verifiable}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-white/70 text-sm">This skill is verifiable</span>
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? 'Adding...' : 'Add Skill'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}