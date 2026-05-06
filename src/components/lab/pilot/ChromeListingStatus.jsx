import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Chrome, ExternalLink, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';

const STATUSES = {
  not_submitted: { label: 'Not Submitted', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  draft: { label: 'Draft', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  in_review: { label: 'In Review', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  live: { label: 'Live', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export default function ChromeListingStatus({ listing }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (listing?.id) {
        return base44.entities.PilotReadiness.update(listing.id, form);
      }
      return base44.entities.PilotReadiness.create({ record_type: 'chrome_listing', ...form });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot-readiness'] }); setEditing(false); },
  });

  const startEdit = () => {
    setForm({
      status: listing?.status || 'not_submitted',
      description: listing?.description || '',
      action_url: listing?.action_url || '',
    });
    setEditing(true);
  };

  const st = STATUSES[listing?.status || 'not_submitted'];

  return (
    <div className="rounded-xl border border-blue-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Chrome className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Chrome Web Store Listing</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${st.color} border text-xs`}>{st.label}</Badge>
          {!editing && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={startEdit}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Review comments / notes..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white h-20" />
          <Input placeholder="Chrome Web Store URL..." value={form.action_url}
            onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white" />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-slate-400"><X className="w-4 h-4 mr-1" />Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              <Check className="w-4 h-4 mr-1" />{saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {listing?.description && (
            <div className="text-sm text-slate-300 bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              {listing.description}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Last updated: {listing?.updated_date ? moment(listing.updated_date).fromNow() : 'Never'}</span>
            {listing?.action_url && (
              <a href={listing.action_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                View Listing <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}