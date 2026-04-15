import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import WidgetPageNavBar from '@/components/widgets/WidgetPageNavBar';
import AxiNFTExplainer from '@/components/widgets/AxiNFTExplainer';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';

const TREASURY = { name: 'Axi Treasury', address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h' };

const SIGNERS = [
  { name: 'Code Node', address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P', weight: 1, color: 'text-blue-400' },
  { name: 'Lore Node', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1, color: 'text-emerald-400' },
  { name: 'Zoe', address: 'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE', weight: 2, color: 'text-pink-400' },
  { name: 'Human / Nathan', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 3, color: 'text-amber-400' },
];

const QUORUM = 4;

const TX_JSON = {
  TransactionType: 'SignerListSet',
  Account: TREASURY.address,
  SignerQuorum: QUORUM,
  SignerEntries: SIGNERS.map(s => ({
    SignerEntry: { Account: s.address, SignerWeight: s.weight }
  }))
};

export default function ConstitutionalMultiSig() {
  const { isUnlocked, getWidgetForPath } = useWidgetUnlock();
  const widgetInfo = getWidgetForPath('wallet.multisig');
  const unlocked = isUnlocked('wallet.multisig');

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const txJsonString = JSON.stringify(TX_JSON, null, 2);

  return (
    <div className="min-h-screen bg-slate-950">
      <WidgetPageNavBar
        title="Constitutional Multi-Sig"
        subtitle={`4 Signers · Quorum ${QUORUM} of 7`}
        icon={Shield}
        isUnlocked={unlocked}
        widgetName={widgetInfo?.widget_name}
        nftId={widgetInfo?.nft_id}
      />
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Signer Table */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-3">Account</p>
            <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] bg-purple-800 border-purple-600 text-purple-300">Treasury</Badge>
                <span className="text-white text-sm font-medium">{TREASURY.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-mono hidden sm:block">{TREASURY.address.slice(0, 8)}…{TREASURY.address.slice(-6)}</span>
                <button onClick={() => copyText(TREASURY.address, 'Address')} className="text-slate-600 hover:text-white transition">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-semibold uppercase mb-3 mt-4">4 Signers</p>
            {SIGNERS.map(s => (
              <div key={s.address} className="flex items-center justify-between gap-2 py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] bg-slate-800 border-slate-700 ${s.color}`}>W{s.weight}</Badge>
                  <span className="text-white text-sm font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-mono hidden sm:block">{s.address.slice(0, 8)}…{s.address.slice(-6)}</span>
                  <button onClick={() => copyText(s.address, s.name)} className="text-slate-600 hover:text-white transition">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400 text-sm">Total Weight</span>
              <span className="text-white text-sm font-mono">7</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 text-sm">Quorum</span>
              <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">{QUORUM} of 7</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Transaction JSON */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-semibold uppercase">Transaction JSON — Copy to Xumm Toolkit</p>
              <Button
                size="sm"
                variant="ghost"
                className="text-purple-400 hover:text-white gap-1.5 h-7 text-xs"
                onClick={() => copyText(txJsonString, 'Transaction JSON')}
              >
                <Copy className="w-3 h-3" />
                Copy JSON
              </Button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
              {txJsonString}
            </pre>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-amber-900/10 border-amber-600/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-amber-400 text-sm font-semibold">How to submit via Xumm Toolkit</p>
            <ol className="text-slate-400 text-xs space-y-1.5 list-decimal list-inside">
              <li>Copy the JSON above</li>
              <li>Open <a href="https://xrpl.services/tools/signerlistset" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline hover:text-purple-300">XRPL Services</a> or the Xumm developer toolkit</li>
              <li>Paste the transaction JSON and sign with the Treasury account</li>
              <li>Confirm the transaction in your Xumm wallet</li>
            </ol>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://xrpscan.com/account/${TREASURY.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white transition"
          >
            <ExternalLink className="w-3 h-3" />
            View Treasury on XRPScan
          </a>
          <a
            href="https://xrpl.services/tools/signerlistset"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white transition"
          >
            <ExternalLink className="w-3 h-3" />
            XRPL Services Toolkit
          </a>
        </div>

        {/* Axi NFT Explainer */}
        <AxiNFTExplainer
          featureName="Constitutional Multi-Sig"
          featurePath="wallet.multisig"
          widgetName={widgetInfo?.widget_name || 'Multisig Setup Widget'}
          nftId={widgetInfo?.nft_id || 'WIDGET-WM-001'}
          description="Multi-signature protection for the Axi Treasury wallet. This feature allows you to configure signer lists, set quorum thresholds, and manage constitutional governance of treasury funds on the XRP Ledger."
          isUnlocked={unlocked}
          setupSteps={[
            'Publish your DID on XRPL mainnet — your sovereign identity is the foundation.',
            'Acquire the "Multisig Setup Widget" NFT through governance, contributions, or trading.',
            'The Widget Unlock Engine verifies your NFT ownership each time you visit this page.',
            'Once unlocked, you can view signer configurations, copy transaction JSON, and submit via Xaman.',
            'Multi-sig transactions require the configured quorum weight to execute — no single signer can act alone.',
          ]}
        />
      </div>
    </div>
  );
}