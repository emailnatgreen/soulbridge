import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletDidRecovery({ wallet, agent, onRecoverySuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [classicAddress, setClassicAddress] = useState(wallet?.classic_address || '');
  const [recoveryResult, setRecoveryResult] = useState(null);

  const handleRecover = async () => {
    if (!classicAddress.trim()) {
      toast.error('Please enter a classic address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('recoverWalletDid', {
        wallet_id: wallet.id,
        agent_id: agent.id,
        classic_address: classicAddress
      });

      if (response.data.success) {
        setRecoveryResult(response.data);
        toast.success('Wallet DID recovered successfully');
        onRecoverySuccess?.(response.data);
      } else {
        toast.error(response.data.message || 'Recovery failed');
        setRecoveryResult(response.data);
      }
    } catch (error) {
      toast.error(error.message || 'Recovery failed');
      setRecoveryResult({
        success: false,
        errors: [error.message]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-amber-200/20 bg-amber-500/5 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-sm text-amber-700">DID Recovery</h3>
          <p className="text-xs text-amber-600 mt-1">
            This wallet's DID is not properly connected to the XRPL. Re-verify the classic address to restore the connection.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-700">Classic Address</label>
          <Input
            value={classicAddress}
            onChange={(e) => setClassicAddress(e.target.value)}
            placeholder="rN7n7otQDd6FczFgLdhmKpn7BxSZoZHjkq"
            className="mt-1"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">Enter or confirm the XRPL classic address for this wallet</p>
        </div>

        <Button
          onClick={handleRecover}
          disabled={isLoading || !classicAddress.trim()}
          className="w-full gap-2"
          variant="default"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Re-verify & Reconnect DID
            </>
          )}
        </Button>
      </div>

      {recoveryResult && (
        <div className={`p-3 rounded-lg space-y-2 ${
          recoveryResult.success
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {recoveryResult.success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Recovery Successful</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Recovery Failed</span>
              </>
            )}
          </div>

          {recoveryResult.success && (
            <div className="space-y-1 text-xs text-green-700">
              <p>✓ XRPL verified</p>
              <p>✓ Wallet updated</p>
              <p>✓ Agent synced</p>
            </div>
          )}

          {recoveryResult.errors && recoveryResult.errors.length > 0 && (
            <div className="space-y-1">
              {recoveryResult.errors.map((error, idx) => (
                <p key={idx} className="text-xs text-red-700">
                  • {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}