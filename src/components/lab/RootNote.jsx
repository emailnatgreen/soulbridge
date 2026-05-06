import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TreePine, Save, Edit3, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const ROOT_NOTE_KEY = 'root_note_node0';

export default function RootNote() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const { data: rootMemory, isLoading } = useQuery({
    queryKey: ['root-note'],
    queryFn: async () => {
      const results = await base44.entities.Memory.filter(
        { agent_id: ROOT_NOTE_KEY, type: 'user_preference' },
        '-created_date',
        1
      );
      return results[0] || null;
    },
  });

  useEffect(() => {
    if (rootMemory?.content) setDraft(rootMemory.content);
  }, [rootMemory]);

  const saveMutation = useMutation({
    mutationFn: async (text) => {
      // Save new version (old ones remain as history)
      await base44.entities.Memory.create({
        agent_id: ROOT_NOTE_KEY,
        type: 'user_preference',
        content: text,
        keywords: ['root_note', 'node_0', 'governor', 'vision'],
        context: `Root Note updated ${new Date().toISOString()}`,
        importance: 10,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['root-note'] });
      setEditing(false);
      toast.success('Root Note saved — logged in Lore');
    },
  });

  const handleSave = () => {
    if (!draft.trim()) return;
    saveMutation.mutate(draft.trim());
  };

  const handleRevert = () => {
    setDraft(rootMemory?.content || '');
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <TreePine className="w-5 h-5 text-amber-400" /> Root Note — Node 0
        </h2>
        <div className="flex items-center gap-2">
          {rootMemory?.created_date && (
            <span className="text-[10px] text-slate-500">
              Last saved: {format(parseISO(rootMemory.created_date), 'MMM d, yyyy HH:mm')}
            </span>
          )}
          {!editing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="text-amber-400 hover:text-amber-300 h-7 gap-1 text-xs"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRevert}
                className="text-slate-400 hover:text-white h-7 gap-1 text-xs"
              >
                <RotateCcw className="w-3 h-3" /> Revert
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white h-7 gap-1 text-xs"
              >
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
      ) : editing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your voice. Your vision. Your invariant reflection..."
          className="bg-white/5 border-amber-500/20 text-white placeholder:text-white/20 min-h-[120px] text-sm"
        />
      ) : (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
          {rootMemory?.content ? (
            <p className="text-amber-100/80 text-sm leading-relaxed whitespace-pre-wrap">{rootMemory.content}</p>
          ) : (
            <p className="text-slate-500 text-sm italic">No Root Note yet. Click Edit to write your first reflection.</p>
          )}
        </div>
      )}
      <p className="text-[10px] text-slate-600 mt-2">All edits logged in Lore · Versioned · Reversible</p>
    </div>
  );
}