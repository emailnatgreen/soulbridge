import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Microscope, Server, Bot, Layout } from 'lucide-react';

const TARGET_TYPES = [
  { value: 'general', label: 'General Investigation', icon: Microscope },
  { value: 'node', label: 'Test Node', icon: Server },
  { value: 'agent', label: 'Test Agent', icon: Bot },
  { value: 'feature', label: 'Test Feature', icon: Layout },
];

export default function InvestigationInput({ onSubmit, isProcessing }) {
  const [question, setQuestion] = useState('');
  const [targetType, setTargetType] = useState('general');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isProcessing) return;
    onSubmit({ question: question.trim(), target_type: targetType });
    setQuestion('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger className="w-44 bg-slate-800/50 border-slate-700 text-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_TYPES.map(t => {
              const Icon = t.icon;
              return (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={targetType === 'node' ? 'Which node to investigate? (e.g. Node 3 integrity, Node 8 behaviour)' : targetType === 'agent' ? 'Which agent to investigate? (e.g. Axi drift analysis, Maya safety check)' : targetType === 'feature' ? 'Which feature to test? (e.g. Governance voting UX, Wallet security logic)' : 'Describe the investigation...'}
          className="min-h-[56px] max-h-32 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isProcessing}
        />
        <Button
          type="submit"
          disabled={!question.trim() || isProcessing}
          className="h-auto px-4 bg-violet-600 hover:bg-violet-500 text-white"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </form>
  );
}