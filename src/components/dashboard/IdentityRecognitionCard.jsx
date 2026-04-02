import React, { useEffect, useState } from 'react';
import { User, Mail, CheckCircle, Shield, Sparkles, ChevronDown, X, Link2, Unlink2 } from 'lucide-react';
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

  useEffect(() => {
    if (!isOpen) return;
    const axiStored = localStorage.getItem('sb_axi_agent_id');
    setAxiAgent(axiStored);
    const buttonConnected = localStorage.getItem('sb_floating_button_enabled') !== 'false';
    setIsConnectedToButton(buttonConnected);
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

        {/* Axi Agent Panel */}
        <div className="border-t border-white/10 pt-6">
          <h4 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Connected Axi Agent</h4>
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{axiAgent ? 'Axi (Mother Boss)' : 'No agent connected'}</p>
                  <p className="text-xs text-white/40">Your primary AI guide in SoulBridge</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleFloatingButton}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                isConnectedToButton
                  ? 'bg-green-600/40 border border-green-500/50 text-green-300 hover:bg-green-600/50'
                  : 'bg-white/10 border border-white/20 text-white/60 hover:bg-white/15'
              }`}
            >
              {isConnectedToButton ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
              {isConnectedToButton ? 'Connected to Floating Button' : 'Connect to Floating Button'}
            </button>
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
                return (
                  <div key={wallet.id} className="bg-black/20 rounded-xl border border-white/10 overflow-hidden">
                    <button
                      onClick={() => setExpandedWallet(isExpanded ? null : wallet.id)}
                      className="w-full flex items-center justify-between gap-2 p-3 hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-xs font-mono text-white truncate">{wallet.classic_address?.slice(0, 16)}...</p>
                          <p className="text-[10px] text-white/40">{wallet.name || 'Published DID'}</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="bg-white/5 border-t border-white/10 p-3 space-y-2">
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
                        <p className="text-[10px] text-white/30 mt-2">Network: {wallet.network || 'mainnet'}</p>
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