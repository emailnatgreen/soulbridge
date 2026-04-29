import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Heart, Briefcase, GraduationCap, Shield, FileSearch, Wrench, Smile } from 'lucide-react';

/**
 * Chrome Skill category selector + emoji picker.
 * Categories aligned with Google's Chrome Skills library (April 2026):
 * Learning, Research, Shopping, Writing, Health & Wellness, Productivity, Compliance.
 */

const SKILL_CATEGORIES = [
  { id: 'research', label: 'Research', icon: FileSearch, emoji: '🔍' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, emoji: '🛒' },
  { id: 'health', label: 'Health & Wellness', icon: Heart, emoji: '💚' },
  { id: 'productivity', label: 'Productivity', icon: Briefcase, emoji: '📋' },
  { id: 'learning', label: 'Learning', icon: GraduationCap, emoji: '📚' },
  { id: 'compliance', label: 'Compliance', icon: Shield, emoji: '✅' },
  { id: 'writing', label: 'Writing', icon: Wrench, emoji: '✍️' },
];

const POPULAR_EMOJIS = [
  '⚡', '🔍', '📊', '🛒', '💰', '🎁', '📄', '🧴', '📚', '✅',
  '🔒', '💚', '📋', '✍️', '🧠', '🌍', '⛓️', '🎯', '🚀', '💡',
  '🔔', '📰', '🥗', '🏥', '🛡️', '🎓', '🤖', '💻', '📈', '🗂️',
];

export default function SkillCategoryPicker({ category, onCategoryChange, emoji, onEmojiChange }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-white/50 text-[10px]">Skill Category</Label>
        <div className="flex gap-1 flex-wrap">
          {SKILL_CATEGORIES.map(c => {
            const CatIcon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCategoryChange(c.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] border transition-colors ${
                  category === c.id
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                }`}
              >
                <CatIcon className="w-2.5 h-2.5" />
                {c.label}
              </button>
            );
          })}
        </div>
        <p className="text-white/20 text-[8px]">Aligned with Chrome's Skill Library categories</p>
      </div>

      {/* Emoji */}
      <div className="space-y-1.5" ref={emojiRef}>
        <Label className="text-white/50 text-[10px]">Skill Emoji</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl hover:border-emerald-500/40 transition-colors"
          >
            {emoji || '⚡'}
          </button>
          <Input
            value={emoji || ''}
            onChange={e => onEmojiChange(e.target.value.slice(-2))}
            placeholder="⚡"
            className="bg-white/5 border-white/10 text-white text-xs h-8 w-16 text-center"
            maxLength={2}
          />
          <p className="text-white/20 text-[8px] flex items-center gap-1">
            <Smile className="w-2.5 h-2.5" /> Shown in Chrome's skill list
          </p>
        </div>
        {showEmojiPicker && (
          <div className="absolute z-50 bg-slate-900 border border-white/20 rounded-xl p-2 shadow-xl grid grid-cols-10 gap-1 max-w-xs">
            {POPULAR_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => { onEmojiChange(e); setShowEmojiPicker(false); }}
                className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}