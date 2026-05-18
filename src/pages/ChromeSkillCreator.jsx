import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Heart, Sparkles, ScrollText } from 'lucide-react';

export default function ChromeSkillCreator() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Chrome Skill Creator</h1>
          <p className="text-sm text-slate-400">Define a new skill for the Chrome agent ecosystem</p>
        </div>

        {/* Skill Title */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Skill Title</label>
          <Input
            placeholder="Enter skill title…"
            className="bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {/* Skill Description */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Skill Description</label>
          <Textarea
            placeholder="Describe what this skill does…"
            rows={4}
            className="bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg resize-none focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {/* Triggers Section */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Triggers
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" />
              Add Trigger
            </Button>
          </div>
          <div className="min-h-[48px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center">
            <span className="text-xs text-slate-600">No triggers defined yet</span>
          </div>
        </div>

        {/* Actions Section */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-teal-400" />
              Actions
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" />
              Add Action
            </Button>
          </div>
          <div className="min-h-[48px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center">
            <span className="text-xs text-slate-600">No actions defined yet</span>
          </div>
        </div>

        {/* Honour + Safety Previews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              Honour Preview
            </h3>
            <p className="text-sm text-slate-600">Honour score will appear here.</p>
          </div>
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Safety Preview
            </h3>
            <p className="text-sm text-slate-600">Safety score will appear here.</p>
          </div>
        </div>

        {/* Create Skill Button */}
        <Button
          disabled
          className="w-full h-12 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create Skill
        </Button>

        {/* Shield Log Banner */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 px-4 py-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-600 shrink-0" />
          <p className="text-xs text-slate-600">Skill creation events will be logged safely.</p>
        </div>
      </div>
    </div>
  );
}