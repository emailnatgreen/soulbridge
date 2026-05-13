import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function VisibilityToggle({ isPublic, onToggle, disabled }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      {isPublic ? (
        <Eye className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <EyeOff className="w-3.5 h-3.5 text-white/30" />
      )}
      <span className={`text-[10px] ${isPublic ? 'text-emerald-400' : 'text-white/40'}`}>
        {isPublic ? 'Public' : 'Private'}
      </span>
      <Switch
        checked={isPublic}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="h-4 w-7 ml-auto"
      />
      {!isPublic && <Lock className="w-3 h-3 text-white/20" />}
    </div>
  );
}