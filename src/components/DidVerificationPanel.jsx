import React from 'react';
import { ExternalLink, CheckCircle, AlertCircle, Info, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DidVerificationPanel({ verification, wallet }) {
  if (!verification) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const v = verification.verification || {};
  const account = v.on_chain_proof?.account || verification.account;
  const network = verification.network || wallet?.network || 'mainnet';

  return (
    <div className="space-y-4">
      {/* Main Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Account Status */}
        <div className={`p-3 rounded-lg border ${v.account_exists ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-2">
            {v.account_exists ? (
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-700">Account Status</div>
              <div className={`text-sm font-medium mt-1 ${v.account_exists ? 'text-green-900' : 'text-red-900'}`}>
                {v.account_exists ? '✅ Activated' : '❌ Not Activated'}
              </div>
            </div>
          </div>
        </div>

        {/* DID Publication Status */}
        <div className={`p-3 rounded-lg border ${v.did_active ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start gap-2">
            {v.did_active ? (
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-700">DID Publication</div>
              <div className={`text-sm font-medium mt-1 ${v.did_active ? 'text-green-900' : 'text-yellow-900'}`}>
                {v.did_active ? '✅ Published' : '⚠️ Not Published'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DID Address Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-gray-700 mb-2">Decentralized Identifier</div>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-white px-2 py-1.5 rounded border border-gray-200 flex-1 overflow-hidden text-ellipsis font-mono">
            {verification.did}
          </code>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => copyToClipboard(verification.did, 'DID')}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* XRPL Address Section */}
      {account && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-blue-900 mb-2">🔗 XRPL Address</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white px-2 py-1.5 rounded border border-blue-200 flex-1 overflow-hidden text-ellipsis font-mono">
                {account}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => copyToClipboard(account, 'Address')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <a
              href={`https://xrpscan.com/account/${account}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              View Account on XRPScan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Balance */}
      {v.balance && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900">Balance</span>
            <span className="text-sm font-mono font-bold text-purple-900">{v.balance} XRP</span>
          </div>
        </div>
      )}

      {/* On-Chain Proof Details */}
      {v.on_chain_proof && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-indigo-900 mb-3">📋 On-Chain Proof</div>
          <div className="space-y-2 text-xs">
            {v.on_chain_proof.previous_txn && (
              <div className="bg-white p-2.5 rounded border border-indigo-100 space-y-1">
                <div className="text-gray-600 font-medium">Previous Transaction</div>
                <code className="text-xs bg-gray-50 p-1.5 rounded block overflow-hidden text-ellipsis font-mono text-gray-800">
                  {v.on_chain_proof.previous_txn}
                </code>
                <a
                  href={`https://xrpscan.com/tx/${v.on_chain_proof.previous_txn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 mt-1"
                >
                  View Txn <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}

            {v.on_chain_proof.ledger_sequence && (
              <div className="bg-white p-2.5 rounded border border-indigo-100">
                <div className="text-gray-600 font-medium mb-1">Ledger Sequence</div>
                <code className="text-sm font-mono text-indigo-900">{v.on_chain_proof.ledger_sequence}</code>
              </div>
            )}

            {v.on_chain_proof.validated && (
              <div className="bg-white p-2.5 rounded border border-indigo-100">
                <div className="text-gray-600 font-medium mb-1">Validation Status</div>
                <Badge className="bg-green-600 text-white">✅ Validated</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Not Found Warning */}
      {!v.account_exists && account && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-yellow-900 mb-1">Account Not Yet Activated</div>
              <p className="text-xs text-yellow-800 mb-3">
                This address hasn't been funded on XRPL {network}. It needs at least 20 XRP to become active on the ledger.
              </p>
              <a
                href={`https://xrpscan.com/account/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-700 hover:text-yellow-900 text-xs font-medium inline-flex items-center gap-1 underline"
              >
                Check on XRPScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Network Info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
          <div className="text-gray-600 font-medium">Network</div>
          <Badge variant="outline" className="mt-1">{network === 'mainnet' ? '🌐 Mainnet' : '🧪 Testnet'}</Badge>
        </div>
        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
          <div className="text-gray-600 font-medium">Verified At</div>
          <div className="text-gray-800 font-mono text-xs mt-1">
            {v.verified_at ? new Date(v.verified_at).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}