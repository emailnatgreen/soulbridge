import React from 'react';
import { Sparkles, ArrowLeft, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { METADATA_STANDARD_VERSION } from '@/lib/nftMetadataSchemas';

export default function WorkshopHeader() {
  return (
    <div className="space-y-3">
      <Link to="/home">
        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white gap-1 -ml-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </Button>
      </Link>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              NFT Workshop
            </h1>
            <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-300 gap-1 hidden sm:flex">
              <Code2 className="w-2.5 h-2.5" /> Metadata v{METADATA_STANDARD_VERSION}
            </Badge>
          </div>
          <p className="text-white/40 text-xs sm:text-sm">
            Mint sovereign Widget NFTs, Chrome Skills &amp; AI Agent NFTs on XRPL — with Dynamic Metadata
          </p>
        </div>
      </div>
    </div>
  );
}