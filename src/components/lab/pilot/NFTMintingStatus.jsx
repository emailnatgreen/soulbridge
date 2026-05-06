import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gem, Plus, ArrowRightLeft, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

function StatCircle({ label, value, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${color}`}>
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
      <span className="text-[10px] text-slate-500 mt-1 uppercase">{label}</span>
    </div>
  );
}

export default function NFTMintingStatus({ nftRecord }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const qc = useQueryClient();

  const { data: transfers = [] } = useQuery({
    queryKey: ['pilot-nft-transfers'],
    queryFn: () => base44.entities.MarketplaceTransaction.filter(
      { marketplace_type: 'widget' }, '-created_date', 10
    ),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        nft_total_minted: parseInt(form.nft_total_minted) || 0,
        nft_available: parseInt(form.nft_available) || 0,
        nft_claimed: parseInt(form.nft_claimed) || 0,
      };
      if (nftRecord?.id) return base44.entities.PilotReadiness.update(nftRecord.id, data);
      return base44.entities.PilotReadiness.create({ record_type: 'nft_status', ...data });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot-readiness'] }); setEditing(false); },
  });

  const startEdit = () => {
    setForm({
      nft_total_minted: nftRecord?.nft_total_minted || 0,
      nft_available: nftRecord?.nft_available || 0,
      nft_claimed: nftRecord?.nft_claimed || 0,
    });
    setEditing(true);
  };

  const minted = nftRecord?.nft_total_minted || 0;
  const available = nftRecord?.nft_available || 0;
  const claimed = nftRecord?.nft_claimed || 0;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">NFT Minting Status</h3>
        </div>
        {!editing && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={startEdit}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {['nft_total_minted', 'nft_available', 'nft_claimed'].map(field => (
            <div key={field}>
              <label className="text-xs text-slate-400 mb-1 block capitalize">{field.replace(/nft_/g, '').replace(/_/g, ' ')}</label>
              <Input type="number" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white" />
            </div>
          ))}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-slate-400"><X className="w-4 h-4 mr-1" />Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white">
              <Check className="w-4 h-4 mr-1" />{saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-6 mb-4">
            <StatCircle label="Minted" value={minted} color="border-purple-500/50" />
            <StatCircle label="Available" value={available} color="border-cyan-500/50" />
            <StatCircle label="Claimed" value={claimed} color="border-emerald-500/50" />
          </div>

          {transfers.length > 0 && (
            <div className="border-t border-slate-700/30 pt-3">
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                <ArrowRightLeft className="w-3 h-3" /> Recent Transfers
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {transfers.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/30">
                    <span className="text-slate-300 truncate">{t.resource_name || 'Widget NFT'}</span>
                    <span className="text-slate-500">{moment(t.created_date).fromNow()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}