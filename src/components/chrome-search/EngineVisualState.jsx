import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Sunset, Snowflake, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Derives the visual state from ES-NFT metadata.
 * Radiant: honour >= 80 AND safety >= 80
 * Amber:   honour >= 40 OR safety >= 40
 * Frosted: below thresholds
 */
export function getEngineVisualState(nft) {
  const honour = nft?.honor_score ?? nft?.result_alignment_score * 100 ?? 50;
  const safety = nft?.safety_integrity ?? 50;
  if (honour >= 80 && safety >= 80) return 'radiant';
  if (honour >= 40 || safety >= 40) return 'amber';
  return 'frosted';
}

const stateConfig = {
  radiant: {
    Icon: Sun,
    ShieldIcon: ShieldCheck,
    label: 'Radiant',
    description: 'High honour, high safety',
    borderColor: 'border-teal-400/60',
    bgGradient: 'from-teal-500/10 via-emerald-500/5 to-transparent',
    textColor: 'text-teal-400',
    shieldColor: 'text-teal-400',
    glowColor: 'shadow-teal-500/20',
    pulseSpeed: 1.5,
  },
  amber: {
    Icon: Sunset,
    ShieldIcon: ShieldAlert,
    label: 'Amber',
    description: 'Moderate standing',
    borderColor: 'border-amber-400/50',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    textColor: 'text-amber-400',
    shieldColor: 'text-amber-400',
    glowColor: 'shadow-amber-500/15',
    pulseSpeed: 3,
  },
  frosted: {
    Icon: Snowflake,
    ShieldIcon: Shield,
    label: 'Frosted',
    description: 'Low standing — restricted',
    borderColor: 'border-slate-500/40',
    bgGradient: 'from-slate-500/10 via-slate-600/5 to-transparent',
    textColor: 'text-slate-400',
    shieldColor: 'text-slate-500',
    glowColor: '',
    pulseSpeed: 0,
  },
};

export { stateConfig };

export default function EngineVisualState({ nft, size = 'md' }) {
  const state = getEngineVisualState(nft);
  const config = stateConfig[state];
  const StateIcon = config.Icon;

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-full border-2 flex items-center justify-center',
        config.borderColor,
        config.glowColor && `shadow-lg ${config.glowColor}`,
        sizeClasses[size]
      )}
      animate={config.pulseSpeed > 0 ? {
        boxShadow: [
          '0 0 0px rgba(0,0,0,0)',
          `0 0 20px rgba(128,255,200,0.15)`,
          '0 0 0px rgba(0,0,0,0)'
        ]
      } : {}}
      transition={config.pulseSpeed > 0 ? {
        duration: config.pulseSpeed,
        repeat: Infinity,
        ease: 'easeInOut'
      } : {}}
    >
      <div className={cn('absolute inset-0 rounded-full bg-gradient-to-br', config.bgGradient)} />
      <StateIcon className={cn('relative z-10', config.textColor, size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-7 h-7' : 'w-10 h-10')} />
    </motion.div>
  );
}