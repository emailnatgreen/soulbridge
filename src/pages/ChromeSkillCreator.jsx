import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Heart, Sparkles, ScrollText, X } from 'lucide-react';

export default function ChromeSkillCreator() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggers, setTriggers] = useState([]);
  const [actions, setActions] = useState([]);

  const canCreate = title.length > 0 && description.length > 0 && triggers.length > 0 && actions.length > 0;

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {/* Skill Description */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Skill Description</label>
          <Textarea
            placeholder="Describe what this skill does…"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1.5 h-8" onClick={() => setTriggers([...triggers, { id: Date.now() }])}>
              <Plus className="w-3.5 h-3.5" />
              Add Trigger
            </Button>
          </div>
          {triggers.length === 0 ? (
            <div className="min-h-[48px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center">
              <span className="text-xs text-slate-600">No triggers defined yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {triggers.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
                  <span className="text-xs text-slate-400">Trigger {i + 1}</span>
                  <button onClick={() => setTriggers(triggers.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-teal-400" />
              Actions
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1.5 h-8" onClick={() => setActions([...actions, { id: Date.now() }])}>
              <Plus className="w-3.5 h-3.5" />
              Add Action
            </Button>
          </div>
          {actions.length === 0 ? (
            <div className="min-h-[48px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center">
              <span className="text-xs text-slate-600">No actions defined yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
                  <span className="text-xs text-slate-400">Action {i + 1}</span>
                  <button onClick={() => setActions(actions.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
          disabled={!canCreate}
          className="w-full h-12 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create Skill
        </Button>

        {/* Google Pay Anchor — Tile 3 will load the Web Pay API here */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 h-12 flex items-center justify-center gap-2 cursor-not-allowed opacity-50">
          <span className="text-sm text-slate-400">Buy with</span>
          <span className="text-sm font-bold text-white">G Pay</span>
          <span className="text-[10px] text-slate-500 ml-1">(Locked)</span>
        </div>

        {/* Shield Log Banner */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 px-4 py-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-600 shrink-0" />
          <p className="text-xs text-slate-600">Skill creation events will be logged safely.</p>
        </div>
      </div>
    </div>
  );
}