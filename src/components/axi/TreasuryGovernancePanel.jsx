import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Vault, CheckCircle, Clock, Zap, AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const statusColors = {
  active:   'bg-blue-100 text-blue-700',
  passed:   'bg-green-100 text-green-700',
  executed: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-gray-100 text-gray-500',
};

export default function TreasuryGovernancePanel() {
  const { data: proposals = [] } = useQuery({
    queryKey: ['axi-treasury-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.filter(
      { proposal_type: 'treasury_allocation' }, '-updated_date', 10
    ),
    refetchInterval: 15000,
  });

  const active   = proposals.filter(p => p.status === 'active').length;
  const passed   = proposals.filter(p => p.status === 'passed').length;
  const executed = proposals.filter(p => p.status === 'executed').length;

  // Find any passed proposals awaiting execution
  const awaitingExecution = proposals.filter(p => {
    if (p.status !== 'passed') return false;
    const sigs = p.action_data?.multisig_signatures || [];
    const unique = [...new Map(sigs.map(s => [s.signer_address, s])).values()];
    return unique.length >= 2 && !p.execution_result?.executed;
  });

  const pendingSigs = proposals.filter(p => {
    if (p.status !== 'passed') return false;
    const sigs = p.action_data?.multisig_signatures || [];
    const unique = [...new Map(sigs.map(s => [s.signer_address, s])).values()];
    return unique.length < 2 && !p.execution_result?.executed;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Vault className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-slate-700">Treasury Governance</span>
        </div>
        <Link to="/TreasuryAllocationProposal" className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1">
          View all <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-blue-700">{active}</p>
          <p className="text-xs text-blue-500">Active</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-700">{passed}</p>
          <p className="text-xs text-green-500">Passed</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-purple-700">{executed}</p>
          <p className="text-xs text-purple-500">Executed</p>
        </div>
      </div>

      {/* Alerts */}
      {awaitingExecution.length > 0 && (
        <Link to="/TreasuryAllocationProposal">
          <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg px-3 py-2 mb-2 hover:bg-green-100 transition">
            <Zap className="w-3 h-3 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 font-medium">
              {awaitingExecution.length} proposal{awaitingExecution.length > 1 ? 's' : ''} ready to execute on-chain
            </p>
          </div>
        </Link>
      )}
      {pendingSigs.length > 0 && (
        <Link to="/TreasurySigningHelper">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mb-2 hover:bg-amber-100 transition">
            <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              {pendingSigs.length} proposal{pendingSigs.length > 1 ? 's' : ''} awaiting multi-sig quorum → Sign now
            </p>
          </div>
        </Link>
      )}

      {/* Recent proposals */}
      <div className="space-y-2">
        {proposals.slice(0, 4).map(p => {
          const sigs = p.action_data?.multisig_signatures || [];
          const unique = [...new Map(sigs.map(s => [s.signer_address, s])).values()];
          return (
            <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{p.title}</p>
                {p.action_data?.amount_xrp && (
                  <p className="text-xs text-slate-400">{p.action_data.amount_xrp} XRP → {p.action_data.recipient_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {(p.status === 'passed' || p.status === 'active') && !p.execution_result?.executed && (
                  <span className="text-xs text-slate-400">{unique.length}/2 sigs</span>
                )}
                <Badge className={`text-xs ${statusColors[p.status] || 'bg-gray-100 text-gray-500'}`}>
                  {p.status}
                </Badge>
              </div>
            </div>
          );
        })}
        {proposals.length === 0 && (
          <p className="text-xs text-slate-400">No treasury proposals yet</p>
        )}
      </div>
    </div>
  );
}