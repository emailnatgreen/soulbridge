import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Plus, Save, Loader2, Copy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const SKILL_TEMPLATE = {
  skill_id: "my_custom_skill",
  skill_category: "technical",
  skill_name: "My Custom Skill",
  skill_description: "Describe what this skill does",
  level: 1,
  max_level: 10,
  proficiency_score: 0,
  skill_growth_trajectory: "stable",
  is_signature_skill: false
};

const VALID_CATEGORIES = [
  'governance', 'resource_management', 'diplomacy', 'technical',
  'wisdom', 'combat', 'creative', 'research', 'leadership', 'wellbeing'
];

const VALID_TRAJECTORIES = ['accelerating', 'growing', 'stable', 'declining'];

export default function SkillJsonEditor({ agentId, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(SKILL_TEMPLATE, null, 2));
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState(null);

  const validate = (text) => {
    try {
      const parsed = JSON.parse(text);
      setParseError(null);

      // Validate required fields
      if (!parsed.skill_id || !parsed.skill_name || !parsed.skill_category) {
        setParseError('Missing required: skill_id, skill_name, skill_category');
        return null;
      }
      if (!VALID_CATEGORIES.includes(parsed.skill_category)) {
        setParseError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        return null;
      }
      if (parsed.skill_growth_trajectory && !VALID_TRAJECTORIES.includes(parsed.skill_growth_trajectory)) {
        setParseError(`Invalid trajectory. Must be one of: ${VALID_TRAJECTORIES.join(', ')}`);
        return null;
      }
      if (parsed.level && (parsed.level < 1 || parsed.level > 10)) {
        setParseError('Level must be between 1 and 10');
        return null;
      }
      return parsed;
    } catch (e) {
      setParseError('Invalid JSON: ' + e.message);
      return null;
    }
  };

  const handleChange = (text) => {
    setJsonText(text);
    validate(text);
  };

  const handleSave = async () => {
    const parsed = validate(jsonText);
    if (!parsed) return;

    setSaving(true);
    try {
      await base44.entities.AgentSkill.create({
        agent_id: agentId,
        ...parsed,
        unlocked_at: new Date().toISOString()
      });
      toast.success(`Skill "${parsed.skill_name}" created`);
      setJsonText(JSON.stringify(SKILL_TEMPLATE, null, 2));
      setParseError(null);
      onSuccess?.();
    } catch (e) {
      toast.error('Failed to create skill: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    toast.success('Copied to clipboard');
  };

  const handleReset = () => {
    setJsonText(JSON.stringify(SKILL_TEMPLATE, null, 2));
    setParseError(null);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader className="pb-2">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4 text-purple-400" />
            Create Skill via JSON
          </CardTitle>
          <div className="flex items-center gap-2">
            {parseError && <Badge className="bg-red-500/20 text-red-300 text-[10px]">Error</Badge>}
            {!parseError && jsonText !== JSON.stringify(SKILL_TEMPLATE, null, 2) && (
              <Badge className="bg-green-500/20 text-green-300 text-[10px]">Valid</Badge>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-3">
          <div className="text-xs text-white/40 space-y-1">
            <p>Required: <code className="text-purple-300">skill_id</code>, <code className="text-purple-300">skill_name</code>, <code className="text-purple-300">skill_category</code></p>
            <p>Categories: {VALID_CATEGORIES.join(', ')}</p>
          </div>

          <Textarea
            value={jsonText}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-black/30 border-white/10 text-white font-mono text-xs min-h-[200px] leading-relaxed"
            spellCheck={false}
          />

          {parseError && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{parseError}</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !!parseError}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {saving ? 'Creating...' : 'Create Skill'}
            </Button>
            <Button onClick={handleCopy} size="sm" variant="outline" className="border-white/10 text-white/60 text-xs">
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button onClick={handleReset} size="sm" variant="ghost" className="text-white/40 text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}