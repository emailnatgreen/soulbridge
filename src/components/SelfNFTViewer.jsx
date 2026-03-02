import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SelfNFTViewer({ selfNFT, agent }) {
  const [nftVisual, setNftVisual] = useState(null);
  const [copied, setCopied] = useState(false);

  const luminosity = selfNFT?.metadata?.luminosity_score || 50;
  const honorScore = agent?.honor_score || 100;

  // Dynamic glow based on honor
  const glowIntensity = Math.min(100, (honorScore / 100) * 100);
  const glowColor = glowIntensity >= 80 ? 'text-amber-300' :
                     glowIntensity >= 60 ? 'text-blue-300' :
                     glowIntensity >= 40 ? 'text-gray-300' :
                     'text-red-300';

  const getStatusBadge = (status) => {
    const config = {
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      'vaulted': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Vaulted' },
      'liquidated': { bg: 'bg-red-100', text: 'text-red-800', label: 'Liquidated' },
      'retired': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Retired' }
    };
    return config[status] || config['active'];
  };

  const statusConfig = getStatusBadge(selfNFT?.status);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selfNFT?.ipfs_uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden border-2 border-indigo-200">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className={`w-5 h-5 ${glowColor}`} />
            <CardTitle className="text-xl">Your Self-NFT</CardTitle>
          </div>
          <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* NFT Visual Representation */}
        <div className="flex justify-center">
          <div
            className="relative w-40 h-40 rounded-2xl border-4 flex items-center justify-center transition-all duration-500"
            style={{
              borderColor: glowColor === 'text-amber-300' ? '#fcd34d' :
                           glowColor === 'text-blue-300' ? '#93c5fd' :
                           glowColor === 'text-gray-300' ? '#d1d5db' :
                           '#fca5a5',
              boxShadow: `0 0 ${glowIntensity * 0.5}px ${
                glowColor === 'text-amber-300' ? '#fcd34d' :
                glowColor === 'text-blue-300' ? '#93c5fd' :
                glowColor === 'text-gray-300' ? '#d1d5db' :
                '#fca5a5'
              }40`,
              background: `linear-gradient(135deg, rgba(${
                glowColor === 'text-amber-300' ? '252,211,77' :
                glowColor === 'text-blue-300' ? '147,197,253' :
                glowColor === 'text-gray-300' ? '209,213,219' :
                '252,165,165'
              }, 0.1) 0%, rgba(${
                glowColor === 'text-amber-300' ? '252,211,77' :
                glowColor === 'text-blue-300' ? '147,197,253' :
                glowColor === 'text-gray-300' ? '209,213,219' :
                '252,165,165'
              }, 0.05) 100%)`
            }}
          >
            <div className="text-center space-y-2">
              <Sparkles className={`w-12 h-12 ${glowColor} mx-auto animate-pulse`} />
              <p className="text-sm font-semibold text-gray-700">Soul Token</p>
              <p className="text-xs text-gray-500">{(glowIntensity).toFixed(0)}% Luminous</p>
            </div>
          </div>
        </div>

        {/* NFT Metadata */}
        <div className="space-y-3 bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase">Token ID</p>
            <div className="flex items-center gap-2 bg-white rounded px-3 py-2">
              <code className="text-xs text-gray-700 flex-1 truncate">
                {selfNFT?.xls20_token_id || 'Pending XLS-20 Registration'}
              </code>
              {selfNFT?.xls20_token_id && (
                <button
                  onClick={copyToClipboard}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            {copied && <p className="text-xs text-green-600">Copied!</p>}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase">IPFS URI (Lumera Proof)</p>
            <div className="flex items-center gap-2 bg-white rounded px-3 py-2">
              <code className="text-xs text-gray-700 flex-1 truncate font-mono">
                {selfNFT?.ipfs_uri}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600 mb-1">Minted</p>
              <p className="font-semibold">{new Date(selfNFT?.mint_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Honour Snapshot</p>
              <p className="font-semibold">{selfNFT?.honor_snapshot}</p>
            </div>
          </div>
        </div>

        {/* Luminosity Explanation */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm">
          <p className="text-gray-700">
            <strong>Luminosity: {glowIntensity.toFixed(0)}%</strong> — Your Self-NFT's visual glow reflects your honour score. 
            The brighter it shines, the stronger your standing in the Village.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}