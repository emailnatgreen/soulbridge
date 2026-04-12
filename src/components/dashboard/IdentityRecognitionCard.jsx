import React, { useEffect, useState } from 'react';
import { User, Mail, CheckCircle, Shield, Sparkles, ChevronDown, X, Link2, Unlink2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function IdentityRecognitionModal({ isOpen, onClose, user }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [expandedWallet, setExpandedWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [axiAgent, setAxiAgent] = useState(null);
  const [isConnectedToButton, setIsConnectedToButton] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sb_identity_profile') || 'null');
      setName(stored?.name || user?.full_name || '');
      setEmail(stored?.email || user?.email || '');
    } catch (_) {
      setName(user?.full_name || '');
      setEmail(user?.email || '');
    }
  }, [user?.full_name, user?.email]);

  const [connectedDid, setConnectedDid] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const axiStored = localStorage.getItem('sb_axi_agent_id');
    setAxiAgent(axiStored);
    const buttonConnected = localStorage.getItem('sb_floating_button_enabled') !== 'false';
    setIsConnectedToButton(buttonConnected);
    try {
      const stored = JSON.parse(localStorage.getItem('sb_connected_did') || 'null');
      setConnectedDid(stored);
    } catch (_) { setConnectedDid(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [walletsRes, agentsRes] = await Promise.all([
          base44.entities.Wallet.filter({ is_published: true }, '-created_date', 20).catch(() => []),
          base44.entities.Agent.list('-created_date', 20).catch(() => [])
        ]);
        setWallets(walletsRes || []);
        setAgents(agentsRes || []);
      } catch (e) {
        console.error('Error loading recognition data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('sb_identity_profile', JSON.stringify({ name, email }));
    setSaved(true);
    window.dispatchEvent(new CustomEvent('sb-signal', {
      detail: {
        id: Date.now(),
        type: 'identity_profile_saved',
        time: new Date().toLocaleTimeString('en-GB'),
        page_name: 'dashboard'
      }
    }));
    setTimeout(() => setSaved(false), 2000);
  };

  const getLinkedAgents = (walletId) => {
    return agents.filter(a => a.wallet_id === walletId || a.classic_address === walletId);
  };

  const handleToggleFloatingButton = () => {
    const newState = !isConnectedToButton;
    setIsConnectedToButton(newState);
    localStorage.setItem('sb_floating_button_enabled', newState ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('sb-floating-button-toggle', { detail: { enabled: newState } }));
  };

  const handleConnectDid = (wallet) => {
    const linkedAgent = getLinkedAgents(wallet.id)?.[0] || null;
    const connection = {
      walletId: wallet.id,
      address: wallet.classic_address,
      did: `did:xrpl:1:${wallet.classic_address}`,
      name: wallet.name || 'Published DID',
      network: wallet.network || 'mainnet',
      agentId: linkedAgent?.id || null,
      agentName: linkedAgent?.name || null,
      agentRole: linkedAgent?.role || null,
    };
    setConnectedDid(connection);
    setIsConnectedToButton(true);
    localStorage.setItem('sb_connected_did', JSON.stringify(connection));
    localStorage.setItem('sb_floating_button_enabled', 'true');

    // CRITICAL: Also update soulbridge_identity — this is what useIdentity/useDIDSignal/Layout use
    const identityData = {
      did: connection.did,
      connected: true,
      role: linkedAgent?.role || null,
      agentId: linkedAgent?.id || null,
      classicAddress: wallet.classic_address,
      timestamp: Date.now(),
      source: 'identity_recognition_modal'
    };
    localStorage.setItem('soulbridge_identity', JSON.stringify(identityData));

    window.dispatchEvent(new CustomEvent('sb-floating-button-toggle', { detail: { enabled: true, connection } }));
    window.dispatchEvent(new CustomEvent('sb-did-connected', { detail: connection }));
    window.dispatchEvent(new CustomEvent('did-connected', { detail: identityData }));
    window.dispatchEvent(new CustomEvent('did-validated', { detail: identityData }));
  };

  const handleDisconnectDid = () => {
    setConnectedDid(null);
    localStorage.removeItem('sb_connected_did');
    window.dispatchEvent(new CustomEvent('sb-did-connected', { detail: null }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Recognition details</p>
            <h3 className="text-white font-semibold text-lg">Your Identity Profile</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Basic Info */}
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Full name</label>
              <div className="relative">
                <User className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-400/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-400/50"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <p className="text-xs text-white/35">This helps SoulBridge recognise you alongside your DID.</p>
            <button
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-500 hover:to-pink-500 transition"
            >
              {saved ? <CheckCircle className="w-4 h-4 inline mr-1" /> : null}
              {saved ? 'Saved' : 'Save details'}
            </button>
          </div>
        </div>

        {/* Floating Button Connection */}
        <div className="border-t border-white/10 pt-6">
          <h4 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Floating Button Connection</h4>
          
          {/* Current connection status */}
          {connectedDid ? (
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-xl border border-green-500/30 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">DID Connected</p>
                    <p className="text-[10px] font-mono text-green-300/60">{connectedDid.did?.slice(0, 28)}...</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectDid}
                  className="text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                >
                  <Unlink2 className="w-3 h-3" /> Disconnect
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/20 rounded-lg p-2">
                  <span className="text-white/40">Wallet</span>
                  <div className="text-white font-medium truncate">{connectedDid.name}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <span className="text-white/40">Network</span>
                  <div className="text-white font-medium capitalize">{connectedDid.network}</div>
                </div>
                {connectedDid.agentName && (
                  <div className="bg-black/20 rounded-lg p-2 col-span-2">
                    <span className="text-white/40">Active Agent</span>
                    <div className="text-purple-300 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {connectedDid.agentName} ({connectedDid.agentRole})
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/30 mt-2">The floating button will open chat with Axi as primary, with this DID context active{connectedDid.agentName ? ` and ${connectedDid.agentName} available` : ''}.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Unlink2 className="w-5 h-5 text-white/30" />
                <div>
                  <p className="text-sm font-medium text-white/60">No DID connected</p>
                  <p className="text-xs text-white/30">Select a published DID below to connect it to the floating button</p>
                </div>
              </div>
            </div>
          )}

          {/* Axi primary note */}
          <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-500/20 p-3 mb-4 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-purple-300">Axi is always your primary guide</p>
              <p className="text-[10px] text-white/40">Chat history is preserved. Connecting a DID adds identity context and linked agent access.</p>
            </div>
          </div>
        </div>

        {/* Published DIDs */}
        <div className="border-t border-white/10 pt-6">
          <h4 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Your Published DIDs</h4>
          {loading ? (
            <p className="text-xs text-white/40">Loading DIDs...</p>
          ) : wallets.length === 0 ? (
            <p className="text-xs text-white/40">No published DIDs yet.</p>
          ) : (
            <div className="space-y-2">
             {wallets.map((wallet) => {
               const linkedAgents = getLinkedAgents(wallet.id);
               const isExpanded = expandedWallet === wallet.id;
               const isThisConnected = connectedDid?.walletId === wallet.id;
               return (
                 <div key={wallet.id} className={`rounded-xl border overflow-hidden ${
                   isThisConnected ? 'bg-green-900/20 border-green-500/30' : 'bg-black/20 border-white/10'
                 }`}>
                   <button
                     onClick={() => setExpandedWallet(isExpanded ? null : wallet.id)}
                     className="w-full flex items-center justify-between gap-2 p-3 hover:bg-white/5 transition"
                   >
                     <div className="flex items-center gap-2 min-w-0 flex-1">
                       <Shield className={`w-4 h-4 flex-shrink-0 ${isThisConnected ? 'text-green-400' : 'text-green-400/60'}`} />
                       <div className="text-left min-w-0 flex-1">
                         <div className="flex items-center gap-2">
                           <p className="text-xs font-mono text-white truncate">{wallet.classic_address?.slice(0, 16)}...</p>
                           {isThisConnected && (
                             <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-1.5 py-0.5 flex-shrink-0">Connected</span>
                           )}
                         </div>
                         <p className="text-[10px] text-white/40">{wallet.name || 'Published DID'}</p>
                       </div>
                     </div>
                     <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                   </button>
                   {isExpanded && (
                     <div className="bg-white/5 border-t border-white/10 p-3 space-y-3">
                       {linkedAgents.length > 0 ? (
                         <div>
                           <p className="text-[10px] text-white/40 mb-1.5 uppercase tracking-wider">LINKED AGENTS</p>
                           {linkedAgents.map((agent) => (
                             <div key={agent.id} className="flex items-center gap-2 text-[10px] text-white/60 mb-1">
                               <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
                               <span className="truncate">{agent.name} ({agent.role})</span>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-[10px] text-white/40">No agents linked to this DID.</p>
                       )}
                       <p className="text-[10px] text-white/30">Network: {wallet.network || 'mainnet'}</p>

                       {/* Connect / Disconnect DID to floating button */}
                       <button
                         onClick={() => isThisConnected ? handleDisconnectDid() : handleConnectDid(wallet)}
                         className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                           isThisConnected
                             ? 'bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20'
                             : 'bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20'
                         }`}
                       >
                         {isThisConnected ? <Unlink2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                         {isThisConnected ? 'Disconnect from Floating Button' : 'Connect to Floating Button'}
                       </button>
                     </div>
                   )}
                 </div>
               );
             })}
            </div>
            )}
            </div>
            </div>
            </div>
            );
            }

            export default IdentityRecognitionModal;