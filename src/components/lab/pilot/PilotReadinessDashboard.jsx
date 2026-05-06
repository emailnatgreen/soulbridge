import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radar } from 'lucide-react';
import LaunchCountdown from './LaunchCountdown';
import ChromeListingStatus from './ChromeListingStatus';
import PilotParticipants from './PilotParticipants';
import FeedbackTracker from './FeedbackTracker';
import NFTMintingStatus from './NFTMintingStatus';

export default function PilotReadinessDashboard() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['pilot-readiness'],
    queryFn: () => base44.entities.PilotReadiness.list('-created_date', 200),
  });

  const config = records.find(r => r.record_type === 'config');
  const chromeListing = records.find(r => r.record_type === 'chrome_listing');
  const participants = records.filter(r => r.record_type === 'participant');
  const feedback = records.filter(r => r.record_type === 'feedback');
  const nftRecord = records.find(r => r.record_type === 'nft_status');

  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-slate-900/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-slate-700 animate-pulse" />
          <div className="w-48 h-5 rounded bg-slate-700 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-lg bg-slate-800/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Radar className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Pilot Readiness — Security Browser Guard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LaunchCountdown config={config} />
        <ChromeListingStatus listing={chromeListing} />
        <PilotParticipants participants={participants} />
        <FeedbackTracker feedback={feedback} />
      </div>

      <div className="mt-4">
        <NFTMintingStatus nftRecord={nftRecord} />
      </div>
    </div>
  );
}