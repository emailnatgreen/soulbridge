import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chrome, Eye, EyeOff, ArrowRight, Sparkles, Globe, User, Layers } from 'lucide-react';

/**
 * Visual simulator showing how a Chrome Skill will appear in the Gemini Side Panel.
 * Matches the actual Chrome Skills UI as launched April 14, 2026.
 */
export default function SkillPreviewSimulator({ skills, name }) {
  const [showPreview, setShowPreview] = useState(false);
  const [activeSkill, setActiveSkill] = useState(0);

  const validSkills = skills.filter(s => s.skill_name && s.instructions);
  if (!validSkills.length) return null;

  const current = validSkills[activeSkill] || validSkills[0];

  return (
    <Card className="bg-blue-500/[0.03] border-blue-500/20">
      <CardContent className="p-3 space-y-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold">Gemini Side Panel Preview</span>
            <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-300">
              Live mockup
            </Badge>
          </div>
          {showPreview ? <EyeOff className="w-3.5 h-3.5 text-white/30" /> : <Eye className="w-3.5 h-3.5 text-white/30" />}
        </button>

        {showPreview && (
          <div className="space-y-3">
            {/* Skill selector tabs */}
            {validSkills.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {validSkills.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSkill(i)}
                    className={`px-2 py-0.5 rounded text-[9px] border transition-colors ${
                      i === activeSkill
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-white/5 border-white/10 text-white/30 hover:text-white/50'
                    }`}
                  >
                    {s.emoji || '⚡'} {s.skill_name || `Skill ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {/* Chrome Side Panel Mockup */}
            <div className="rounded-xl border border-slate-600/50 bg-white overflow-hidden shadow-2xl max-w-sm mx-auto">
              {/* Chrome header bar */}
              <div className="bg-[#f1f3f4] px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-slate-800 text-xs font-medium">Gemini</span>
                <span className="text-slate-400 text-[10px] ml-auto">Side Panel</span>
              </div>

              {/* Prompt input area — showing the slash command */}
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-full px-3 py-1.5 border border-slate-200">
                  <span className="text-slate-400 text-xs">/</span>
                  <span className="text-blue-600 text-xs font-medium">
                    {current.trigger_command?.replace('/', '') || current.skill_name}
                  </span>
                  <ArrowRight className="w-3 h-3 text-blue-500 ml-auto" />
                </div>
              </div>

              {/* Skill card as it appears in Skills library */}
              <div className="p-3 space-y-2">
                <div className="bg-[#e8f5e9] rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{current.emoji || '⚡'}</span>
                    <span className="text-slate-800 text-xs font-semibold">{current.skill_name}</span>
                  </div>
                  {current.skill_category && (
                    <span className="text-[9px] text-green-700 bg-green-100 rounded-full px-2 py-0.5 inline-block">
                      {current.skill_category}
                    </span>
                  )}
                  <p className="text-slate-600 text-[10px] leading-relaxed line-clamp-3">
                    {current.instructions?.slice(0, 150)}{current.instructions?.length > 150 ? '...' : ''}
                  </p>
                </div>

                {/* Context indicators */}
                <div className="flex items-center gap-3 text-[9px] text-slate-400 px-1">
                  <span className="flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" />
                    Running on current page
                  </span>
                  {current.multi_tab && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <Layers className="w-2.5 h-2.5" />
                      + selected tabs
                    </span>
                  )}
                </div>

                {/* Simulated response */}
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-slate-700 text-[10px] font-medium">Running "{current.skill_name}"...</p>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#f8f9fa] px-3 py-1.5 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[8px] text-slate-400">Skill from: {name || 'Your NFT'}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span className="text-[8px] text-green-600">Active</span>
                </div>
              </div>
            </div>

            <p className="text-white/20 text-[9px] text-center">
              This preview simulates how your skill appears in Chrome's Gemini Side Panel (April 2026)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}