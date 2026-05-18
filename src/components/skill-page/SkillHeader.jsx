import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function SkillHeader({ skill }) {
  const createdDate = skill.created_date ? format(new Date(skill.created_date), 'PPP') : '—';
  const creatorDid = skill.agent_id || skill.created_by || 'Unknown';
  const category = skill.category || 'other';
  const status = skill.status || 'available';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{skill.title}</h1>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{skill.description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20 text-[10px] uppercase">
            {category}
          </Badge>
          <Badge className={`text-[10px] uppercase ${
            status === 'available' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
            status === 'archived' ? 'bg-slate-500/15 text-slate-400 border-slate-500/20' :
            'bg-amber-500/15 text-amber-400 border-amber-500/20'
          }`}>
            {status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span className="font-mono truncate max-w-[200px]">{creatorDid}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{createdDate}</span>
        </div>
      </div>
    </div>
  );
}