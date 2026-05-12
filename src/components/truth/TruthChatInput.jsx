import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

export default function TruthChatInput({ onSubmit, isProcessing }) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isProcessing) return;
    onSubmit(question.trim());
    setQuestion('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask anything — the Truth Engine will verify it..."
        className="min-h-[56px] max-h-32 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none"
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
        className="h-auto px-4 bg-cyan-600 hover:bg-cyan-500 text-white"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </form>
  );
}