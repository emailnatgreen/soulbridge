import React, { useState, useEffect, useRef } from 'react';
import AscNftVisualizer from '@/components/asc-nft/AscNftVisualizer';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const defaultNft = {
  sincerity_score: 92,
  total_attestations: 12,
  average_honour_weight: 88,
  token_id: 'ASC-VISUAL-TEST',
  owner_did: 'did:sb:test_creator',
  proficiency_tier: 2,
};

export default function MyAscNftDisplayPage() {
  const [nft, setNft] = useState(defaultNft);
  const [sincerityDelta, setSincerityDelta] = useState(0);
  const prevSincerity = useRef(nft.sincerity_score);

  useEffect(() => {
    const newDelta = nft.sincerity_score - prevSincerity.current;
    if (newDelta !== 0) {
      setSincerityDelta(newDelta);
    }
    prevSincerity.current = nft.sincerity_score;
  }, [nft.sincerity_score]);

  const handleSincerityChange = (value) => {
    setNft(prev => ({ ...prev, sincerity_score: value[0] }));
  };

  const handleAttestationsChange = (value) => {
    setNft(prev => ({ ...prev, total_attestations: value[0] }));
  };

  const handleHonourChange = (value) => {
    setNft(prev => ({ ...prev, average_honour_weight: value[0] }));
  };
  
  const applyDelta = (delta) => {
    setNft(prev => ({...prev, sincerity_score: Math.max(0, Math.min(100, prev.sincerity_score + delta))}))
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">ASC-NFT Visualizer</h1>
          <p className="text-slate-400 mt-2">Dynamic Visual Binding for the Agent Skill Creator NFT</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Controls</CardTitle>
                <CardDescription>Simulate metadata changes to see visual updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sincerity Score: {nft.sincerity_score}</label>
                  <Slider defaultValue={[nft.sincerity_score]} max={100} step={1} onValueChange={handleSincerityChange} />
                  <div className="flex gap-2 pt-2">
                     <Button size="sm" variant="outline" onClick={() => applyDelta(5)}>+5</Button>
                     <Button size="sm" variant="outline" onClick={() => applyDelta(-10)}>-10 (Shock)</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Attestations: {nft.total_attestations}</label>
                  <Slider defaultValue={[nft.total_attestations]} max={20} step={1} onValueChange={handleAttestationsChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Average Honour Weight: {nft.average_honour_weight}</label>
                  <Slider defaultValue={[nft.average_honour_weight]} max={100} step={1} onValueChange={handleHonourChange} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex items-center justify-center py-8">
            <AscNftVisualizer ascNft={nft} sincerityDelta={sincerityDelta} />
          </div>
        </div>
      </div>
    </div>
  );
}