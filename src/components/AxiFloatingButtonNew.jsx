import React, { useState, useEffect, useCallback } from 'react';
import { Shield, User, Circle, Sparkles } from 'lucide-react';
import { useIdentity } from '@/hooks/useIdentity';
import { useAgentRoom } from '@/hooks/useAgentRoom';

/**
 * Axi Chat Floating Button
 * Displays identity-aware button with DID verification badge
 * Handles open-axi events and manages chat visibility
 * 
 * @param {boolean} chatOpen - Whether chat is currently open
 * @param {function} setChatOpen - Handler to toggle chat
 * @param {string} currentPageName - Current page to check if button should show
 */
export default function AxiFloatingButton({ chatOpen, setChatOpen, currentPageName }) {
  const [walletUpdating, setWalletUpdating] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [connectedDid, setConnectedDid] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_connected_did') || 'null'); } catch(_) { return null; }
  });
  const { isRecognized, isAdmin, didSignal, walletSignal } = useIdentity();
  const { activeAgents } = useAgentRoom();

  // Pages where floating button should NOT appear
  const NO_FLOAT_PAGES = ['Axi', 'MentorshipHub', 'ScrollOfResonance', 'KineticCompass'];
  const shouldShow = isRecognized && !NO_FLOAT_PAGES.includes(currentPageName) && !chatOpen;

  // Track active agent — prefer connected DID's agent, then room agents, then Axi
  useEffect(() => {
    if (connectedDid?.agentName) {
      setActiveAgent({ id: connectedDid.agentId, name: connectedDid.agentName, role: connectedDid.agentRole });
    } else if (activeAgents?.[0]) {
      setActiveAgent(activeAgents[0]);
    } else {
      setActiveAgent({ name: 'Axi', role: 'guide' });
    }
  }, [activeAgents, connectedDid]);

  // Listen for DID connection changes from the identity panel
  useEffect(() => {
    const handleDidConnection = (e) => {
      setConnectedDid(e.detail || null);
    };
    window.addEventListener('sb-did-connected', handleDidConnection);
    return () => window.removeEventListener('sb-did-connected', handleDidConnection);
  }, []);

  // Listen for external open-axi events
  const handleOpenAxi = useCallback(() => setChatOpen(true), [setChatOpen]);

  useEffect(() => {
    window.addEventListener('open-axi', handleOpenAxi);
    window.addEventListener('open-axi-with-agent', handleOpenAxi);
    window.addEventListener('open-axi-with-message', handleOpenAxi);
    return () => {
      window.removeEventListener('open-axi', handleOpenAxi);
      window.removeEventListener('open-axi-with-agent', handleOpenAxi);
      window.removeEventListener('open-axi-with-message', handleOpenAxi);
    };
  }, [handleOpenAxi]);

  // Monitor wallet updates
  useEffect(() => {
    if (walletSignal?.type === 'wallet_updated' || walletSignal?.type === 'did_published') {
      setWalletUpdating(true);
      const timer = setTimeout(() => setWalletUpdating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [walletSignal]);

  if (!shouldShow) return null;

  // Determine badge status — connected DID takes priority
  const getBadgeStatus = () => {
    if (walletUpdating) return { color: 'bg-blue-400', pulse: true, title: '📊 Updating' };
    if (connectedDid) return { color: 'bg-green-400', pulse: false, title: `DID: ${connectedDid.address?.slice(0, 8)}… · ${connectedDid.agentName || 'Axi'}` };
    if (didSignal?.loading) return { color: 'bg-yellow-400', pulse: true, title: 'Verifying DID...' };
    if (didSignal?.isVerified) return { color: 'bg-green-400', pulse: false, title: `DID Verified: ${didSignal?.did?.slice(0, 10)}...` };
    return { color: 'bg-amber-400', pulse: false, title: 'No DID connected' };
  };

  const badge = getBadgeStatus();
  const agentName = activeAgent?.name || 'Axi';

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100]">
      <button
        onClick={() => {
          setChatOpen(true);
          // If a DID is connected with a linked agent, pass that context
          if (connectedDid?.agentId) {
            window.dispatchEvent(new CustomEvent('open-axi-with-agent', {
              detail: { agent: activeAgent, did: connectedDid }
            }));
          }
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-transform hover:scale-110 active:scale-95 relative ${
          connectedDid
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-green-400/30'
            : isAdmin
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-amber-300/30'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-purple-400/30'
        }`}
        title={connectedDid ? `${connectedDid.agentName || 'Axi'} · ${connectedDid.address?.slice(0,8)}…` : `Open chat with ${agentName}`}
      >
        {connectedDid ? <Shield className="w-6 h-6 text-white" /> : isAdmin ? <Shield className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
        
        {/* DID verification badge */}
        <Circle
          className={`w-3 h-3 fill-current absolute bottom-0 right-0 rounded-full border border-white ${
            badge.pulse ? 'animate-pulse' : ''
          } ${badge.color}`}
        />
      </button>
    </div>
  );
}