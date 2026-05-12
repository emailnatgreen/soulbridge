import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Gem, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MintNFTPreview({ report }) {
  const [copied, setCopied] = useState(false);
  const [signalling, setSignalling] = useState(false);
  const [intentRecorded, setIntentRecorded] = useState(report?.mint_intent || false);

  if (!report || report.status !== 'complete') return null;

  const meta = report.nft_metadata;
  const hash = report.report_hash;

  const handleCopyMetadata = () => {
    navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
    setCopied(true);
    toast.success('NFT metadata copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMintIntent = async () => {
    setSignalling(true);
    try {
      await base44.functions.invoke('truthEngine', {
        action: 'mint_intent',
        report_id: report.id,
      });
      setIntentRecorded(true);
      toast.success('Mint intent recorded');
    } catch (err) {
      toast.error('Failed to record intent');
    } finally {
      setSignalling(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
        >
          <Gem className="w-3.5 h-3.5" />
          Mint as Research NFT
          <Badge className="text-[8px] bg-purple-500/20 text-purple-300/60 border-purple-500/30 ml-1">COMING SOON</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-purple-500/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-purple-300 flex items-center gap-2">
            <Gem className="w-5 h-5" />
            Research NFT Metadata Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hash Anchor */}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Cryptographic Anchor</p>
            <p className="text-cyan-300 font-mono text-[11px] break-all">{hash}</p>
          </div>

          {/* Metadata JSON */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">NFT Metadata (Frozen Schema)</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-white/30 hover:text-white"
                onClick={handleCopyMetadata}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <pre className="text-[10px] text-white/50 font-mono leading-relaxed overflow-auto max-h-64">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </div>

          {/* Veracity Summary */}
          {meta?.veracity && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Avg', value: meta.veracity.avg_score },
                { label: 'Min', value: meta.veracity.min_score },
                { label: 'Max', value: meta.veracity.max_score },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
                  <p className="text-white/30 text-[9px]">{label}</p>
                  <p className="text-white font-mono text-sm">{(value * 100).toFixed(0)}%</p>
                </div>
              ))}
            </div>
          )}

          {/* Mint Intent Button */}
          <Button
            onClick={handleMintIntent}
            disabled={intentRecorded || signalling}
            className={`w-full gap-2 ${intentRecorded
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 cursor-default'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {signalling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : intentRecorded ? (
              <>
                <Check className="w-4 h-4" />
                Mint Intent Recorded
              </>
            ) : (
              <>
                <Gem className="w-4 h-4" />
                Signal Mint Intent
              </>
            )}
          </Button>

          <p className="text-white/20 text-[10px] text-center">
            NFT minting will be enabled when Node 3 integration is live. Your intent is logged on the TruthReport record.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}