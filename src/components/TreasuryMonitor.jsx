import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Syncs live mainnet balance for the official treasury, then alerts Axi if below threshold
const ALERT_THRESHOLD_XRP = 150;
const POLL_INTERVAL = 5 * 60 * 1000; // every 5 minutes
const OFFICIAL_TREASURY_ADDRESS = 'rK1dsNbsip594ArX4cQS8Acn2ibApEQjwU';
const OFFICIAL_TREASURY_ID = '69a94b388df36ee80fa7092d';

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
          content: `🚨 **TREASURY ALERT — ${title}**\n${message}\n\nPlease assess financial sustainability and advise.`,
        });
      }
    } catch (e) {
      console.error('TreasuryMonitor notifyAxi error:', e);
    }
  };

  const checkTreasury = async () => {
    try {
      // Sync live balance from mainnet
      const syncRes = await base44.functions.invoke('syncTreasuryBalance', {
        treasury_id: OFFICIAL_TREASURY_ID,
        classic_address: OFFICIAL_TREASURY_ADDRESS,
      });

      const balance = syncRes.data?.balance ?? null;
      if (balance === null) return;

      if (balance < ALERT_THRESHOLD_XRP) {
        const key = `${OFFICIAL_TREASURY_ID}-${Math.floor(balance / 10)}`;
        if (alerted.current.has(key)) return;
        alerted.current.add(key);

        const title = `⚠️ Low Treasury Balance`;
        const message = `SoulBridge Main Treasury is ${balance.toFixed(2)} XRP — below the ${ALERT_THRESHOLD_XRP} XRP safety threshold.`;
        toast.warning(title, { description: message, duration: 12000 });
        await notifyAxi(title, message);
      }
    } catch (e) {
      console.error('TreasuryMonitor check failed:', e);
    }
  };

  useEffect(() => {
    checkTreasury();
    const interval = setInterval(checkTreasury, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}