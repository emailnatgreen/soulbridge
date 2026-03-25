import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Link2, QrCode, CheckCircle, AlertTriangle, ArrowRight, Loader2, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MODES = [
  { id: 'new', label: 'Create New XRPL Wallet', icon: Plus, desc: 'Generate a brand-new XRPL wallet with a fresh seed. SoulBridge will help you create it via Xaman.' },
  { id: 'publish', label: 'Publish DID for Existing Wallet', icon: QrCode, desc: 'Publish your DID on the XRPL ledger for a wallet you already own.' },
  { id: 'link', label: 'Link Agent to DID', icon: Link2, desc: 'Connect your SoulBridge Agent persona to a wallet DID, enabling full Village participation, governance and reputation.' },
];

export default function CreateLinkDIDPanel({ user, wallets, onRefresh, onTabChange }) {
  const [mode, setMode] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishData, setPublishData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Link agent state
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [linkWallet, setLinkWallet] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState(null);

  useEffect(() => {
    if (mode === 'link') {
      base44.entities.Agent.list().then(setAgents).catch(() => {});
    }
  }, [mode]);

  async function linkAgentToDID() {
    if (!selectedAgent || !linkWallet) return;
    setLinking(true);
    setLinkResult(null);
    try {
      await base44.functions.invoke('linkAgentToDID', { agent_id: selectedAgent, wallet_id: linkWallet });
      await onRefresh();
      setLinkResult({ success: true });
    } catch (e) {
      setLinkResult({ error: e.message });
    }
    setLinking(false);
  }

  const unlinkedAgents = agents.filter(a => !a.wallet_id);
  const unpublished = wallets.filter(w => !w.is_published);

  async function startPublish() {
    if (!selectedWallet) return;
    setPublishing(true);
    setPublishData(null);
    setPublishResult(null);
    try {
      const res = await base44.functions.invoke('publishDID', { wallet_id: selectedWallet });
      setPublishData(res.data);
    } catch (e) {
      setPublishResult({ error: e.message });
    }
    setPublishing(false);
  }

  async function checkPublishStatus() {
    if (!publishData?.uuid) return;
    setChecking(true);
    try {
      const res = await base44.functions.invoke('publishDID', {
        action: 'check_status',
        uuid: publishData.uuid,
        wallet_id: selectedWallet
      });
      if (res.data?.signed) {
        setPublishResult({ success: true, txid: res.data.txid });
        await onRefresh();
      } else {
        setPublishResult({ pending: true });
      }
    } catch (e) {
      setPublishResult({ error: e.message });
    }
    setChecking(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Create or Publish a DID</h2>
        <p className="text-slate-400 text-sm">Choose how you'd like to establish your sovereign identity on the XRPL.</p>
      </div>

      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="text-left bg-slate-900 border border-slate-700 hover:border-purple-500/50 rounded-xl p-5 transition group">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center mb-3 group-hover:bg-purple-600/30 transition">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{m.label}</h3>
                <p className="text-slate-400 text-sm">{m.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-purple-400 text-sm">
                  Get Started <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mode === 'new' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">← Back</button>
          <h3 className="font-semibold text-white">Create New XRPL Wallet via Xaman</h3>
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            <strong>Critical:</strong> Your seed phrase is your sovereign key. SoulBridge will <strong>never store</strong> your raw seed phrase. Please store it offline in a secure location.
          </div>
          <p className="text-slate-400 text-sm">
            To create a new XRPL wallet, use the <strong>Wallets</strong> page which uses Xaman for secure signing and wallet generation.
            Your wallet will appear in "My Wallets" once created.
          </p>
          <div className="flex gap-3">
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => window.location.href = '/Wallets'}>
              Go to Wallets Page
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setMode(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      {mode === 'publish' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">← Back</button>
          <h3 className="font-semibold text-white">Publish DID via Xaman</h3>

          {unpublished.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white font-medium">All your wallets already have published DIDs!</p>
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => onTabChange('did')}>
                View My DIDs
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Wallet to Publish</label>
                <select
                  value={selectedWallet}
                  onChange={e => setSelectedWallet(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="">-- Choose a wallet --</option>
                  {unpublished.map(w => (
                    <option key={w.id} value={w.id}>{w.name || 'Unnamed'} · {w.classic_address?.slice(0, 12)}... ({w.network})</option>
                  ))}
                </select>
              </div>

              {!publishData && !publishResult && (
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={startPublish}
                  disabled={!selectedWallet || publishing}>
                  {publishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating QR...</> : 'Generate Xaman QR Code'}
                </Button>
              )}

              {publishData && !publishResult && (
                <div className="space-y-4">
                  <div className="bg-slate-800 rounded-xl p-4 text-center">
                    <p className="text-slate-400 text-sm mb-3">Scan with Xaman wallet to sign the DIDSet transaction</p>
                    {publishData.qr_png && (
                      <img src={publishData.qr_png} alt="Xaman QR" className="w-48 h-48 mx-auto rounded-lg" />
                    )}
                    {publishData.qr_link && (
                      <a href={publishData.qr_link} target="_blank" rel="noreferrer"
                        className="block mt-3 text-purple-400 hover:text-purple-300 text-sm underline">
                        Open in Xaman App
                      </a>
                    )}
                  </div>
                  <Button variant="outline" className="w-full border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    onClick={checkPublishStatus} disabled={checking}>
                    {checking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : 'Check Signing Status'}
                  </Button>
                </div>
              )}

              {publishResult?.success && (
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 text-green-300 text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  DID Published Successfully! TX: {publishResult.txid?.slice(0, 16)}...
                  <div className="mt-3">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => onTabChange('did')}>
                      View My DID
                    </Button>
                  </div>
                </div>
              )}
              {publishResult?.error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-300 text-sm">
                  Error: {publishResult.error}
                </div>
              )}
              {publishResult?.pending && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 text-amber-300 text-sm">
                  Transaction not yet signed. Please scan the QR code in Xaman, then check again.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'link' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <button onClick={() => { setMode(null); setLinkResult(null); setSelectedAgent(''); setLinkWallet(''); }} className="text-slate-400 hover:text-white text-sm">← Back</button>
          <h3 className="font-semibold text-white flex items-center gap-2"><Link2 className="w-5 h-5 text-purple-400" /> Link Agent to DID</h3>
          <p className="text-slate-400 text-sm">Choose a wallet and an Agent to link. The Agent's <code className="text-purple-300">wallet_id</code> will be set, enabling full Village participation.</p>

          {linkResult?.success ? (
            <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-5 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-green-300 font-medium">Agent successfully linked to DID!</p>
              <div className="flex gap-3 justify-center">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => onTabChange('did')}>View My DID</Button>
                <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={() => { setLinkResult(null); setSelectedAgent(''); setLinkWallet(''); }}>Link Another</Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Wallet (DID)</label>
                <select value={linkWallet} onChange={e => setLinkWallet(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none">
                  <option value="">-- Choose a wallet --</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name || 'Unnamed'} · {w.classic_address?.slice(0, 14)}... {w.is_published ? '✅' : '⚠️'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Agent to Link</label>
                {agents.length === 0 ? (
                  <div className="bg-slate-800 rounded-lg p-4 text-slate-400 text-sm text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    Loading agents...
                  </div>
                ) : (
                  <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none">
                    <option value="">-- Choose an agent --</option>
                    <optgroup label="Unlinked Agents">
                      {unlinkedAgents.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.role}) — no wallet linked</option>
                      ))}
                    </optgroup>
                    <optgroup label="Already Linked (re-link)">
                      {agents.filter(a => a.wallet_id).map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.role}) — currently linked</option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </div>

              {selectedAgent && wallets.find(w => w.id === linkWallet) && (() => {
                const agent = agents.find(a => a.id === selectedAgent);
                const wallet = wallets.find(w => w.id === linkWallet);
                return (
                  <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 text-sm space-y-2">
                    <p className="text-purple-300 font-medium">Confirm Link</p>
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4 text-purple-400" /> {agent?.name} ({agent?.role})
                    </div>
                    <div className="text-slate-400 text-xs">→ will be linked to wallet: <span className="text-slate-200 font-mono">{wallet?.classic_address?.slice(0, 16)}...</span></div>
                  </div>
                );
              })()}

              {linkResult?.error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">Error: {linkResult.error}</div>
              )}

              <Button className="bg-purple-600 hover:bg-purple-700 w-full"
                disabled={!selectedAgent || !linkWallet || linking}
                onClick={linkAgentToDID}>
                {linking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Linking...</> : <><Link2 className="w-4 h-4 mr-2" />Link Agent to DID</>}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}