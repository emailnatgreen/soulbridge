import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, Pencil, Trash2, X } from 'lucide-react';

export default function DIDWalletEditor({ wallet, onSaved, onDeleted }) {
  const initialValues = useMemo(() => ({
    name: wallet.name || '',
    classic_address: wallet.classic_address || '',
    network: wallet.network || 'testnet',
    notes: wallet.notes || '',
    published_txid: wallet.published_txid || '',
  }), [wallet]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [values, setValues] = useState(initialValues);

  const handleChange = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

  const handleCancel = () => {
    setValues(initialValues);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await base44.entities.Wallet.update(wallet.id, {
      name: values.name,
      classic_address: values.classic_address,
      network: values.network,
      notes: values.notes,
      published_txid: values.published_txid,
    });
    setIsSaving(false);
    setIsEditing(false);
    onSaved?.();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await base44.entities.Wallet.delete(wallet.id);
    setIsDeleting(false);
    onDeleted?.();
  };

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1" onClick={() => setIsEditing(true)}>
          <Pencil className="w-3 h-3" /> Edit DID
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1">
            <span className="text-xs text-red-300">Delete wallet?</span>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-red-300 hover:bg-red-500/20 hover:text-red-200" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Yes'}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-slate-300 hover:bg-white/10" onClick={() => setConfirmDelete(false)}>
              No
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs gap-1" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-500/30 bg-black/20 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-white/50">Wallet Name</Label>
          <Input value={values.name} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Network</Label>
          <select value={values.network} onChange={(e) => handleChange('network', e.target.value)} className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none">
            <option value="testnet">testnet</option>
            <option value="mainnet">mainnet</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-white/50">Classic Address</Label>
          <Input value={values.classic_address} onChange={(e) => handleChange('classic_address', e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white font-mono" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-white/50">Published TX ID</Label>
          <Input value={values.published_txid} onChange={(e) => handleChange('published_txid', e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white font-mono" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-white/50">Notes</Label>
          <Textarea value={values.notes} onChange={(e) => handleChange('notes', e.target.value)} className="mt-1 min-h-[100px] bg-white/10 border-white/20 text-white" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1" onClick={handleSave} disabled={isSaving}>
          <Check className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1" onClick={handleCancel}>
          <X className="w-3 h-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}