import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Zap, ExternalLink } from 'lucide-react';

export default function TreasuryExecutionPanel({ proposal, onExecuted }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const action = proposal?.action_data || {};
  const signatures = (action.multisig_signatures || []).filter(s => s?.signer_address && s?.tx_blob);
  const uniqueSigners = [...new Map(signatures.map(s => [s.signer_address, s])).values()];
  const QUORUM = 2;
  const canExecute = proposal?.status === 'passed' && uniqueSigners.length >= QUORUM && !proposal?.execution_result?.executed;

  const handleExecute = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    const res = await base44.functions.invoke('executeTreasuryAllocation', { proposal_id: proposal.id });
    setLoading(false);
    if (res.data?.success) {
      setResult(res.data);
      if (onExecuted) onExecuted(res.data);
    } else {
      setError(res.data?.error || 'Execution failed');
    }
  };

  if (proposal?.execution_result?.executed) {
    return (
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-purple-300 font-medium">
          <CheckCircle className="w-4 h-4" /> Executed On-Chain
        </div>
        <p className="text-white/50 text-xs">TX: <span className="font-mono">{proposal.execution_result.execution_tx_hash || proposal.execution_result.tx_hash}</span></p>
        <a
          href={`https://livenet.xrpl.org/transactions/${proposal.execution_result.tx_hash}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
        >
          View on XRPL Explorer <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <p className="text-white/70 text-sm font-medium flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" /> Multi-Sig Execution
      </p>

      {/* Signature status */}
      <div className="flex items-center gap-2">
        <Badge className={uniqueSigners.length >= QUORUM
          ? 'bg-green-500/20 text-green-300 border-green-500/30'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}>
          {uniqueSigners.length}/{QUORUM} signatures collected
        </Badge>
        <Badge className={proposal?.status === 'passed'
          ? 'bg-green-500/20 text-green-300 border-green-500/30'
          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}>
          {proposal?.status}
        </Badge>
      </div>

      {uniqueSigners.length > 0 && (
        <div className="space-y-1">
          {uniqueSigners.map(s => (
            <div key={s.signer_address} className="text-xs text-white/40 font-mono flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
              {s.signer_name || s.signer_address}
            </div>
          ))}
        </div>
      )}

      {!canExecute && (
        <p className="text-white/30 text-xs flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          {proposal?.status !== 'passed'
            ? 'Proposal must be in "passed" status to execute.'
            : `Need ${QUORUM - uniqueSigners.length} more signature(s) to meet quorum.`}
        </p>
      )}

      {error && (
        <p className="text-red-300 text-xs flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}

      {result && (
        <div className="text-green-300 text-xs space-y-1">
          <p className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {result.message}</p>
          <a href={`https://livenet.xrpl.org/transactions/${result.tx_hash}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300">
            View TX <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {canExecute && (
        <Button onClick={handleExecute} disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2">
          {loading ? 'Submitting to XRPL…' : <><Zap className="w-4 h-4" /> Execute Treasury Transfer</>}
        </Button>
      )}
    </div>
  );
}