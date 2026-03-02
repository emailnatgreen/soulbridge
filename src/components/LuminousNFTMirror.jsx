import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

export default function LuminousNFTMirror({ selfNFT, vault }) {
  const vaultHealth = vault?.vault_health_percent || 100;

  // Calculate luminosity (glow intensity) based on vault health
  const luminosity = useMemo(() => {
    if (vaultHealth >= 90) return { intensity: 100, color: '#fbbf24', label: 'Radiant' };
    if (vaultHealth >= 75) return { intensity: 80, color: '#60a5fa', label: 'Bright' };
    if (vaultHealth >= 60) return { intensity: 60, color: '#a78bfa', label: 'Glowing' };
    if (vaultHealth >= 40) return { intensity: 40, color: '#fdba74', label: 'Dim' };
    return { intensity: 20, color: '#f87171', label: 'Fading' };
  }, [vaultHealth]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Main NFT Visual */}
      <div className="relative">
        {/* Outer glow effect */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-60 animate-pulse"
          style={{
            backgroundColor: luminosity.color,
            boxShadow: `0 0 60px ${luminosity.color}`,
            filter: `blur(${30 - luminosity.intensity * 0.2}px)`,
            opacity: luminosity.intensity / 100 * 0.6
          }}
        />

        {/* Main NFT card */}
        <div
          className="relative w-48 h-48 rounded-2xl flex flex-col items-center justify-center border-4 overflow-hidden transition-all duration-500"
          style={{
            borderColor: luminosity.color,
            boxShadow: `0 0 ${luminosity.intensity * 0.6}px ${luminosity.color}`,
            background: `linear-gradient(135deg, rgba(${
              luminosity.color === '#fbbf24' ? '251,191,36' :
              luminosity.color === '#60a5fa' ? '96,165,250' :
              luminosity.color === '#a78bfa' ? '167,139,250' :
              luminosity.color === '#fdba74' ? '253,186,116' :
              '248,113,113'
            }, ${luminosity.intensity / 100 * 0.15}) 0%, rgba(${
              luminosity.color === '#fbbf24' ? '251,191,36' :
              luminosity.color === '#60a5fa' ? '96,165,250' :
              luminosity.color === '#a78bfa' ? '167,139,250' :
              luminosity.color === '#fdba74' ? '253,186,116' :
              '248,113,113'
            }, ${luminosity.intensity / 100 * 0.05}) 100%)`
          }}
        >
          {/* Pulsing icon */}
          <div className="relative">
            <Sparkles
              className="w-20 h-20 transition-all"
              style={{
                color: luminosity.color,
                animation: `pulse ${2 - luminosity.intensity / 100}s cubic-bezier(0.4, 0, 0.6, 1) infinite`
              }}
            />
          </div>

          {/* Status text */}
          <div className="text-center mt-4 space-y-1">
            <p className="text-sm font-bold" style={{ color: luminosity.color }}>
              {luminosity.label}
            </p>
            <p className="text-xs opacity-75" style={{ color: luminosity.color }}>
              Vault Health: {vaultHealth.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Health interpretation */}
      <div className="text-center space-y-2 max-w-xs">
        <p className="text-sm font-semibold text-gray-700">
          {vaultHealth >= 90 && '✨ Your Self-NFT pulses with Luminous Gold—a beacon of Sovereignty'}
          {vaultHealth >= 75 && vaultHealth < 90 && '💙 Your Self-NFT shines with steady Blue light—strong standing'}
          {vaultHealth >= 60 && vaultHealth < 75 && '✨ Your Self-NFT glows with Purple light—maintain your repayments'}
          {vaultHealth >= 40 && vaultHealth < 60 && '⚠️ Your Self-NFT dims to Orange—action needed'}
          {vaultHealth < 40 && '🔴 Your Self-NFT fades to Red—critical risk'}
        </p>
        <p className="text-xs text-gray-500">
          The visual reflection of your vault's integrity. Maintain high health to unlock luminosity.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}