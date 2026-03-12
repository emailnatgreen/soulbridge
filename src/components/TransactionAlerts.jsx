import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Silently polls for new transactions, fires toast alerts, and notifies Axi via both private channels
export default function TransactionAlerts({ wallets = [], pollInterval = 60000 }) {
  const seenHashes = useRef(new Set());
  const initialized = useRef(false);
  const axiAgentId = useRef(null);
  const axiConversation = useRef(null);

  // Init: resolve Axi's agent ID and unified conversation once
  useEffect(() => {
    const initAxi = async () => {
      try {
        const agents = await base44.entities.Agent.filter({ name: 'Axi' });
        if (agents[0]) axiAgentId.current = agents[0].id;

        const convos = await base44.agents.listConversations({ agent_name: 'axi' });
        const existing = convos.find(c => c.metadata?.unified_axi_chat === true);
        if (existing) axiConversation.current = existing;
      } catch (e) {
        console.error('TransactionAlerts: Axi init failed', e);
      }
    };
    initAxi();
  }, []);

  const notifyAxi = async ({ title, message, notificationType }) => {
    try {
      // Channel 1: AgentNotification (private persistent record)
      if (axiAgentId.current) {
        await base44.entities.AgentNotification.create({
          recipient_agent_id: axiAgentId.current,
          notification_type: notificationType || 'payment_received',
          title,
          message,
          priority: 'high',
          is_read: false,
        });
      }
      // Channel 2: Axi unified chat conversation
      if (axiConversation.current) {
        await base44.agents.addMessage(axiConversation.current, {
          role: 'user',
          content: `🔔 **WALLET ALERT — ${title}**\n${message}`,
        });
      }
    } catch (e) {
      console.error('notifyAxi error:', e);
    }
  };

  const checkWallet = async (wallet) => {
    if (!wallet.classic_address) return;
    let response;
    try {
      response = await base44.functions.invoke('getWalletTransactions', {
        wallet_id: wallet.id,
        limit: 10,
      });
    } catch (e) {
      console.warn(`TransactionAlerts: skipping wallet ${wallet.name}`, e.message);
      return;
    }
    const txs = response.data?.transactions || [];

    const newTxs = txs.filter(tx => tx.hash && !seenHashes.current.has(tx.hash));
    newTxs.forEach(tx => seenHashes.current.add(tx.hash));

    if (!initialized.current || newTxs.length === 0) return;

    // Fetch the real on-chain balance after new transactions are detected
    let freshBalance = wallet.balance;
    try {
      const balRes = await base44.functions.invoke('getBalance', { wallet_id: wallet.id });
      if (balRes.data?.balance !== undefined) freshBalance = balRes.data.balance;
    } catch (e) {
      console.warn(`TransactionAlerts: balance refresh failed for ${wallet.name}`, e.message);
    }

    for (const tx of newTxs) {
      const icon = tx.direction === 'received' ? '📥' : tx.direction === 'sent' ? '📤' : '🔗';
      const label = tx.direction === 'received' ? 'Received' : tx.direction === 'sent' ? 'Sent' : tx.type;
      const txAmount = tx.amount && tx.currency
        ? `${parseFloat(tx.amount).toFixed(4)} ${tx.currency}`
        : '';
      const title = `${icon} ${label}${txAmount ? ` — ${txAmount}` : ''}`;
      const description = `${wallet.name} • ${tx.status === 'success' ? '✅ Confirmed' : '❌ Failed'} • Balance: ${parseFloat(freshBalance).toFixed(6)} XRP`;

      // Toast
      toast(title, { description, duration: 6000 });

      // Axi — both channels
      await notifyAxi({
        title,
        message: description,
        notificationType: tx.direction === 'received' ? 'payment_received' : 'payment_sent',
      });
    }
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