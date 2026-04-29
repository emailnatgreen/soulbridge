import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Chrome, Copy, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Generates a Chrome-ready prompt that users can paste directly into
 * the Gemini Side Panel to create a Skill — matching the April 2026
 * Chrome Skills format (slash commands, page-aware prompts).
 */
function buildChromePrompt(skill) {
  const parts = [];
  
  if (skill.skill_name) {
    parts.push(`[Skill: ${skill.emoji || '⚡'} ${skill.skill_name}]`);
  }
  if (skill.trigger_command) {
    parts.push(`Trigger: ${skill.trigger_command}`);
  }
  if (skill.multi_tab) {
    parts.push(`Context: Run on the current page AND all selected tabs.`);
  } else {
    parts.push(`Context: Run on the current page.`);
  }
  parts.push('');
  parts.push(skill.instructions || '');
  
  return parts.join('\n');
}

export default function ChromeSkillCopyExport({ skills }) {
  const validSkills = skills.filter(s => s.skill_name && s.instructions);

  const handleCopyAll = () => {
    const text = validSkills.map(s => buildChromePrompt(s)).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast.success(`${validSkills.length} skill prompt${validSkills.length !== 1 ? 's' : ''} copied — paste into Gemini Side Panel`);
  };

  const handleCopyOne = (skill) => {
    navigator.clipboard.writeText(buildChromePrompt(skill));
    toast.success(`"${skill.skill_name}" prompt copied — paste into Gemini Side Panel and save as Skill`);
  };

  if (!validSkills.length) return null;

  return (
    <Card className="bg-emerald-500/[0.03] border-emerald-500/20">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Chrome className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-xs font-semibold">Chrome-Ready Export</span>
            <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-300">
              Paste & Save
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="text-emerald-300 hover:text-emerald-200 gap-1 text-[10px] h-6"
          >
            <Copy className="w-3 h-3" /> Copy All
          </Button>
        </div>

        <p className="text-white/30 text-[9px] leading-relaxed">
          Copy these prompts and paste them into Chrome's Gemini Side Panel. Then click "Save as Skill" to make them instantly reusable with <code className="text-emerald-300/60">/</code> commands.
        </p>

        <div className="space-y-1.5">
          {validSkills.map((skill, i) => (
            <button
              key={i}
              onClick={() => handleCopyOne(skill)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors text-left group"
            >
              <span className="text-sm flex-shrink-0">{skill.emoji || '⚡'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-[10px] font-medium truncate">{skill.skill_name}</p>
                <p className="text-emerald-300/40 text-[8px] font-mono">{skill.trigger_command || 'no trigger'}</p>
              </div>
              <ClipboardCheck className="w-3.5 h-3.5 text-white/10 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}