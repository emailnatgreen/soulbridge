import React, { useState } from 'react';
import { Copy, Check, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PublicHashFooter({ hash, hashAlgo, schema, processingMs }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hash) return null;

  return (
    <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-cyan-400/60" />
          <span className="text-cyan-400/60 text-[10px] uppercase tracking-wider font-semibold">Cryptographic Anchor</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-cyan-400/50 hover:text-cyan-300 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-cyan-300/80 font-mono text-[10px] break-all select-all cursor-pointer">{hash}</p>
      <div className="flex flex-wrap gap-2">
        {schema && <Badge className="text-[8px] bg-white/5 text-white/30 border-white/10">{schema}</Badge>}
        {hashAlgo && <Badge className="text-[8px] bg-white/5 text-white/30 border-white/10">{hashAlgo.toUpperCase()}</Badge>}
        {processingMs && <Badge className="text-[8px] bg-white/5 text-white/30 border-white/10">{(processingMs / 1000).toFixed(1)}s pipeline</Badge>}
      </div>
    </div>
  );
}