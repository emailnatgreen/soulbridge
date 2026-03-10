import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Monitors Treasury balances and alerts Axi (both channels) when below threshold
const ALERT_THRESHOLD_XRP = 100;
const POLL_INTERVAL = 5 * 60 * 1000; // every 5 minutes

export default function TreasuryMonitor() {
  const axiAgentId = useRef(null);
  const axiConversation = useRef(null);
  const alerted = useRef(new Set());

  useEffect(() => {
    const initAxi = async () => {
      try {
        const agents = await base44.entities.Agent.filter({ name: 'Axi' });
        if (agents[0]) axiAgentId.current = agents[0].id;

        const convos = await base44.agents.listConversations({ agent_name: 'axi' });
        const existing = convos.find(c => c.metadata?.unified_axi_chat === true);
        if (existing) axiConversation.current = existing;
      } catch (e) {
        console.error('TreasuryMonitor: Axi init failed', e);
      }
    };
    initAxi();
  }, []);

  const notifyAxi = async (title, message) => {
    try {
      if (axiAgentId.current) {
        await base44.entities.AgentNotification.create({
          recipient_agent_id: axiAgentId.current,
          notification_type: 'system',
          title,
          message,
          priority: 'urgent',
          is_read: false,
        });
      }
      if (axiConversation.current) {
        await base44.agents.addMessage(axiConversation.current, {
          role: 'user',
          content: `🚨 **TREASURY ALERT — ${title}**\n${message}\n\nPlease assess financial sustainability and advise co-creator.`,
        });
      }
    } catch (e) {
      console.error('TreasuryMonitor notifyAxi error:', e);
    }
  };

  const checkTreasuries = async () => {
    try {
      const treasuries = await base44.entities.Treasury.list();
      for (const treasury of treasuries) {
        const balance = treasury.total_balance ?? 0;
        if (balance < ALERT_THRESHOLD_XRP) {
          // Deduplicate alerts per treasury per balance bucket (avoids spam)
          const key = `${treasury.id}-${Math.floor(balance / 10)}`;
          if (alerted.current.has(key)) continue;
          alerted.current.add(key);

          const title = `⚠️ Low Treasury — ${treasury.name}`;
          const message = `Balance is ${balance} XRP on ${treasury.classic_address ? treasury.classic_address.slice(0, 12) + '…' : 'unknown address'} — below the ${ALERT_THRESHOLD_XRP} XRP safety threshold.`;

          toast.warning(title, { description: message, duration: 12000 });
          await notifyAxi(title, message);
        }
      }
    } catch (e) {
      console.error('TreasuryMonitor check failed:', e);
    }
  };

  useEffect(() => {
    checkTreasuries();
    const interval = setInterval(checkTreasuries, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}