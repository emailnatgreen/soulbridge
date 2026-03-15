import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Save, CheckCircle2 } from 'lucide-react';

export default function AgentPersonalityPanel() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [editedPersonality, setEditedPersonality] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-personality'],
    queryFn: () => base44.entities.Agent.list('-updated_date', 100),
  });

  const selected = agents.find(a => a.id === selectedId);

  const handleSelect = (id) => {
    setSelectedId(id);
    setSaved(false);
    const agent = agents.find(a => a.id === id);
    setEditedPersonality(agent?.personality || '');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const oldPersonality = selected?.personality || '';
      await base44.entities.Agent.update(selectedId, { personality: editedPersonality });
      // Memory entry for Axi awareness
      await base44.entities.Memory.create({
        content: `[Personality Update] Governor updated personality of agent "${selected?.name}" (ID: ${selectedId}).\nOLD: ${oldPersonality}\nNEW: ${editedPersonality}\nChanged at: ${new Date().toISOString()}`,
        tags: ['personality_change', 'governor_action', selectedId],
        importance: 'high',
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-personality'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm font-semibold text-white">Agent Personality Management</h3>
      </div>

      {/* Agent selector */}
      <select
        value={selectedId}
        onChange={e => handleSelect(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        <option value="">— Select an agent —</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
        ))}
      </select>

      {selected && (
        <>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Current personality</p>
            <p className="text-xs text-slate-300 italic">{selected.personality || '(none set)'}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Edit personality</p>
            <Textarea
              value={editedPersonality}
              onChange={e => { setEditedPersonality(e.target.value); setSaved(false); }}
              placeholder="e.g. Nurturing, Firm, Curious, Strategic..."
              className="bg-slate-800/60 border-slate-600/50 text-slate-200 text-xs resize-none h-20 placeholder:text-slate-500"
            />
          </div>

          <Button
            size="sm"
            disabled={saveMutation.isPending || !editedPersonality.trim()}
            onClick={() => saveMutation.mutate()}
            className={`w-full text-xs h-8 ${saved ? 'bg-green-600 hover:bg-green-600' : 'bg-violet-600 hover:bg-violet-700'}`}
          >
            {saved ? <><CheckCircle2 className="w-3 h-3 mr-1" />Saved!</> : <><Save className="w-3 h-3 mr-1" />Save Personality</>}
          </Button>
        </>
      )}
    </div>
  );
}