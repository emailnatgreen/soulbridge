import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, StopCircle, ShieldAlert } from 'lucide-react';

export default function EmergencyStopControl() {
  const [status, setStatus] = useState('armed'); // 'armed' | 'triggered'
  const [confirming, setConfirming] = useState(false);

  const handleTrigger = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setStatus('triggered');
    setConfirming(false);
  };

  const handleReset = () => {
    setStatus('armed');
    setConfirming(false);
  };

  if (status === 'triggered') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/60 border border-red-600 rounded-lg animate-pulse">
        <StopCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
        <span className="text-red-300 text-xs font-bold uppercase tracking-wider">ALL AGENTS STOPPED</span>
        <button
          onClick={handleReset}
          className="ml-2 text-xs text-red-400 underline hover:text-red-300"
        >
          Reset
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-700 rounded-lg">
        <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
        <span className="text-red-300 text-xs font-semibold">Confirm stop?</span>
        <button
          onClick={handleTrigger}
          className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded font-bold"
        >
          YES — STOP ALL
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleTrigger}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-red-800/60 hover:border-red-600 hover:bg-red-950/40 rounded-lg transition-colors group"
      title="CR-01/2026 Emergency Stop — halts all Trader Agents"
    >
      <StopCircle className="h-4 w-4 text-red-600 group-hover:text-red-400" />
      <span className="text-red-600 group-hover:text-red-400 text-xs font-semibold uppercase tracking-wider">Emergency Stop</span>
      <Badge className="bg-gray-800 text-gray-500 border-gray-700 text-xs py-0 ml-1">CR-01/2026</Badge>
    </button>
  );
}