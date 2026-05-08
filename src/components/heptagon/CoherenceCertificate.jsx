import React from 'react';
import { Award, Shield, Flower2, XCircle } from 'lucide-react';

export default function CoherenceCertificate({ result, batchResult }) {
  // Certificate for batch runs
  if (batchResult) {
    const rate = batchResult.successRate;
    const isCoherent = rate > 25; // Theoretical optimal is ~31%
    return (
      <div className={`rounded-2xl border-2 p-5 text-center space-y-3 ${
        isCoherent
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}>
        {isCoherent ? (
          <Flower2 className="w-10 h-10 text-amber-400 mx-auto" />
        ) : (
          <XCircle className="w-10 h-10 text-red-400/60 mx-auto" />
        )}
        <div>
          <p className={`text-lg font-bold ${isCoherent ? 'text-amber-300' : 'text-red-300'}`}>
            {isCoherent ? '🌳 Golden Bloom — Coherence Achieved' : 'Scar Recorded — Chain Broken'}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {isCoherent
              ? `${batchResult.successes}/${batchResult.batchSize} runs achieved full coherence (${rate}%). The system demonstrates emergent, leaderless collaboration.`
              : `Success rate ${rate}% — below threshold. Bottlenecks identified. The Oak scars, then heals.`
            }
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] text-white/25">
          <Shield className="w-3 h-3" />
          <span>{batchResult.timestamp}</span>
          <span>·</span>
          <span>{batchResult.batchSize}× batch</span>
          <span>·</span>
          <span>{batchResult.totalTimeMs}ms total</span>
        </div>
      </div>
    );
  }

  // Certificate for single run
  if (!result) return null;
  const isCoherent = result.success;

  return (
    <div className={`rounded-2xl border-2 p-5 text-center space-y-3 ${
      isCoherent
        ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/5'
        : 'border-red-500/30 bg-red-500/5'
    }`}>
      {isCoherent ? (
        <Award className="w-10 h-10 text-amber-400 mx-auto" />
      ) : (
        <XCircle className="w-10 h-10 text-red-400/60 mx-auto" />
      )}
      <div>
        <p className={`text-lg font-bold ${isCoherent ? 'text-amber-300' : 'text-red-300'}`}>
          {isCoherent ? '🌳 Golden Bloom — All 100 Found Their Key' : 'Scar — Chain Broken'}
        </p>
        <p className="text-white/40 text-xs mt-1">
          {isCoherent
            ? `${result.successCount}/${result.prisonerCount} prisoners found their number. Longest cycle: ${result.longestCycle} (≤${result.maxAllowedSteps}). Proof of emergent coordination.`
            : `${result.successCount}/${result.prisonerCount} found their number. Longest cycle: ${result.longestCycle} > ${result.maxAllowedSteps}. Lesson recorded.`
          }
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] text-white/25">
        <Shield className="w-3 h-3" />
        <span>{result.timestamp}</span>
        <span>·</span>
        <span>{result.totalTimeMs.toFixed(2)}ms</span>
      </div>
    </div>
  );
}