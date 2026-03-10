import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Link } from 'lucide-react';

// Silently polls for new transactions and fires toast alerts
export default function TransactionAlerts({ wallets = [], pollInterval = 60000 }) {
  const seenHashes = useRef(new Set());
  const initialized = useRef(false);

  const checkWallet = async (wallet) => {
    if (!wallet.classic_address) return;
    const response = await base44.functions.invoke('getWalletTransactions', {
      wallet_id: wallet.id,
      limit: 10,
    });
    const txs = response.data?.transactions || [];

    txs.forEach(tx => {
      if (!tx.hash) return;
      if (seenHashes.current.has(tx.hash)) return;
      seenHashes.current.add(tx.hash);

      // On first load just seed the set, don't alert
      if (!initialized.current) return;

      const icon = tx.direction === 'received' ? '📥' :
                   tx.direction === 'sent' ? '📤' : '🔗';
      const label = tx.direction === 'received' ? 'Received' :
                    tx.direction === 'sent' ? 'Sent' : tx.type;
      const amount = tx.amount && tx.currency
        ? `${parseFloat(tx.amount).toFixed(4)} ${tx.currency}`
        : '';

      toast(
        `${icon} ${label}${amount ? ` — ${amount}` : ''}`,
        {
          description: `${wallet.name} • ${tx.status === 'success' ? '✅ Confirmed' : '❌ Failed'}`,
          duration: 6000,
        }
      );
    });
  };

  useEffect(() => {
    if (!wallets.length) return;

    const runCheck = async () => {
      await Promise.all(wallets.map(checkWallet));
      initialized.current = true;
    };

    runCheck();
    const interval = setInterval(runCheck, pollInterval);
    return () => clearInterval(interval);
  }, [wallets.map(w => w.id).join(',')]);

  return null;
}