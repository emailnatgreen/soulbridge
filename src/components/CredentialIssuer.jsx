import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const CREDENTIAL_TYPES = [
  { value: 'skill_certification', label: 'Skill Certification', color: 'bg-blue-600' },
  { value: 'achievement', label: 'Achievement', color: 'bg-purple-600' },
  { value: 'professional_license', label: 'Professional License', color: 'bg-indigo-600' },
  { value: 'educational_degree', label: 'Educational Degree', color: 'bg-cyan-600' },
  { value: 'membership', label: 'Membership', color: 'bg-teal-600' },
  { value: 'authorization', label: 'Authorization', color: 'bg-emerald-600' },
  { value: 'compliance_attestation', label: 'Compliance', color: 'bg-amber-600' },
  { value: 'identity_verified', label: 'Identity Verified', color: 'bg-green-600' },
];

export default function CredentialIssuer() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('skill_certification');
  const [credName, setCredName] = useState('');
  const [credData, setCredData] = useState('');
  const [recipientDid, setRecipientDid] = useState('');
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-cred'],
    queryFn: () => base44.entities.Agent.list('-created_date', 50),
  });

  const issueMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('issueDidCredential', payload),
    onSuccess: () => {
      toast.success('Credential issued successfully');
      queryClient.invalidateQueries({ queryKey: ['didCredentials'] });
      setOpen(false);
      setCredName('');
      setCredData('');
      setRecipientDid('');
      setSelectedType('skill_certification');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to issue credential');
    },
  });

  const handleSubmit = () => {
    if (!credName.trim() || !recipientDid.trim()) {
      toast.error('Name and recipient DID are required');
      return;
    }

    issueMutation.mutate({
      recipient_did: recipientDid,
      credential_type: selectedType,
      credential_name: credName,
      credential_data: credData ? JSON.parse(credData).catch ? {} : JSON.parse(credData) : {},
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Issue Credential
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Issue a Verifiable Credential</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 block mb-2">Credential Type</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {CREDENTIAL_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setSelectedType(ct.value)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedType === ct.value
                      ? `${ct.color} border-white/50 text-white`
                      : 'border-white/10 text-white/50 hover:text-white'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/70 block mb-2">Credential Name</label>
            <Input
              placeholder="e.g., Advanced Solidity Master"
              value={credName}
              onChange={e => setCredName(e.target.value)}
              className="bg-slate-800 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 block mb-2">Recipient (Agent)</label>
            <select
              value={recipientDid}
              onChange={e => setRecipientDid(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-lg text-white text-sm"
            >
              <option value="">Select an agent…</option>
              {agents.map(a => (
                <option key={a.id} value={a.classic_address || a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-white/70 block mb-2">Details (JSON, optional)</label>
            <textarea
              placeholder='{"score": 95, "duration": "4 weeks"}'
              value={credData}
              onChange={e => setCredData(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-lg text-white text-xs font-mono h-20 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={issueMutation.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {issueMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Issuing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Issue
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}