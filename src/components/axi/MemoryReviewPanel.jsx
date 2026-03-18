import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BUNDLE_SIZE = 50;

export default function MemoryReviewPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedBundle, setExpandedBundle] = useState(null);

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories-review'],
    queryFn: () => base44.entities.Memory.list('-importance', 500),
  });

  // Bundle memories into groups of 50
  const bundles = Array.from({ length: Math.ceil(memories.length / BUNDLE_SIZE) }, (_, i) =>
    memories.slice(i * BUNDLE_SIZE, (i + 1) * BUNDLE_SIZE)
  );

  const saveMutation = useMutation({
    mutationFn: async (bundle) => {
      const bundleContent = bundle
        .map(m => `[${m.type}] ${m.content}${m.context ? ` (Context: ${m.context})` : ''}`)
        .join('\n\n');
      
      await base44.entities.Memory.create({
        agent_id: 'axi',
        type: 'observation',
        content: `Memory Review Bundle - ${bundle.length} memories analyzed and categorized for awareness`,
        context: `Bundle index: ${bundles.indexOf(bundle) + 1}/${bundles.length}`,
        keywords: ['memory_review', 'batch_analysis', 'axi_awareness'],
        importance: 9,
      });

      toast.success(`Saved review of ${bundle.length} memories`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories-review'] });
    },
  });

  const handleSendBundle = (bundle, index) => {
    const bundleContent = bundle
      .map((m, i) => `${i + 1}. [${m.type}] ${m.content}${m.context ? ` (Context: ${m.context})` : ''}`)
      .join('\n\n');
    
    const msg = `Memory Review Bundle ${index + 1}/${bundles.length} (${bundle.length} memories):\n\n${bundleContent}`;
    sessionStorage.setItem('axi_pending_message', msg);
    toast.success(`Sending bundle ${index + 1} to Axi…`);
    navigate('/Axi');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-violet-400 animate-spin mr-2" />
        <span className="text-slate-400 text-sm">Loading memories…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Memory Bundles</h3>
        <span className="text-xs text-slate-500">{memories.length} total memories · {bundles.length} bundles</span>
      </div>

      {bundles.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-6">No memories to review</p>
      ) : (
        <div className="space-y-2">
          {bundles.map((bundle, idx) => (
            <Card key={idx} className="bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60 transition-all">
              <CardContent className="p-3">
                <button
                  onClick={() => setExpandedBundle(expandedBundle === idx ? null : idx)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="text-left flex-1">
                    <p className="text-xs font-semibold text-white">Bundle {idx + 1}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{bundle.length} memories</p>
                  </div>
                  {expandedBundle === idx ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {expandedBundle === idx && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-2">
                    <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs text-slate-400 bg-slate-900/30 p-2 rounded">
                      {bundle.map((m, i) => (
                        <div key={i} className="border-l-2 border-slate-700 pl-2 py-0.5">
                          <span className="text-slate-500">[{m.type}]</span> {m.content.substring(0, 60)}
                          {m.content.length > 60 ? '…' : ''}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleSendBundle(bundle, idx)}
                        size="sm"
                        className="flex-1 bg-violet-700 hover:bg-violet-600 text-white text-xs gap-1.5 h-7"
                      >
                        <Sparkles className="w-3 h-3" />
                        Send to Axi
                      </Button>
                      <Button
                        onClick={() => saveMutation.mutate(bundle)}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300 hover:text-white text-xs gap-1.5 h-7"
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save Review
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/40">
        <p>💡 Send bundles to Axi for dialogue, or save reviews to build awareness memories.</p>
      </div>
    </div>
  );
}