import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Sunset, Snowflake, Lock, Unlock, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const getVisualState = (sincerity) => {
  if (sincerity >= 90) return 'radiant';
  if (sincerity >= 50) return 'amber';
  return 'frosted';
};

const stateConfig = {
  radiant: {
    Icon: Sun,
    label: 'Trusted Creator',
    frameColor: 'border-green-400/50',
    bgColor: 'bg-green-900/10',
    gradientFrom: 'from-green-500/10',
    gateIcon: Unlock,
    gateColor: 'text-green-400',
    auraColor: 'border-green-400/80'
  },
  amber: {
    Icon: Sunset,
    label: 'In Regeneration',
    frameColor: 'border-amber-400/50',
    bgColor: 'bg-amber-900/10',
    gradientFrom: 'from-amber-500/10',
    gateIcon: Zap,
    gateColor: 'text-amber-400',
    auraColor: 'border-amber-400/70'
  },
  frosted: {
    Icon: Snowflake,
    label: 'Creation Paused',
    frameColor: 'border-sky-400/40',
    bgColor: 'bg-sky-900/20',
    gradientFrom: 'from-sky-500/10',
    gateIcon: Lock,
    gateColor: 'text-sky-400',
    auraColor: 'border-sky-400/60'
  }
};

const HonourAura = ({ total_attestations, average_honour_weight }) => {
  const ringCount = Math.min(20, total_attestations || 0);
  const brightness = (average_honour_weight || 0) / 100;

  const getBrightnessClass = () => {
    if (average_honour_weight >= 86) return 'opacity-90';
    if (average_honour_weight >= 61) return 'opacity-60';
    return 'opacity-30';
  };

  return (
    <div className={cn('absolute inset-0 flex items-center justify-center', getBrightnessClass())}>
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ 
            width: `${100 + i * 15}px`, 
            height: `${100 + i * 15}px`,
            borderColor: `hsla(140, 70%, 60%, ${0.5 * brightness})`
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.05 } }}
        />
      ))}
    </div>
  );
};

export default function AscNftVisualizer({ ascNft, sincerityDelta }) {
  const [visualState, setVisualState] = useState(getVisualState(ascNft.sincerity_score));
  const [animation, setAnimation] = useState(null);

  useEffect(() => {
    setVisualState(getVisualState(ascNft.sincerity_score));
  }, [ascNft.sincerity_score]);

  useEffect(() => {
    if (sincerityDelta) {
      if (sincerityDelta < -4) {
        setAnimation('shock');
      } else if (sincerityDelta > 0) {
        setAnimation('glow');
      }
      const timer = setTimeout(() => setAnimation(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [sincerityDelta]);

  const config = stateConfig[visualState];
  const StateIcon = config.Icon;
  const GateIcon = config.gateIcon;

  return (
    <div className="w-full max-w-sm mx-auto font-sans">
      <motion.div 
        className={cn(
          'relative aspect-square rounded-full border-2 p-2 transition-colors duration-500',
          config.frameColor
        )}
        animate={visualState}
      >
        <motion.div className={cn('relative w-full h-full rounded-full overflow-hidden flex items-center justify-center', config.bgColor)}>
          <div className={cn('absolute inset-0 bg-gradient-to-br', config.gradientFrom, 'to-transparent')} />
          
          <AnimatePresence>
            {animation === 'shock' && (
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-red-500"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            )}
            {animation === 'glow' && (
              <motion.div 
                className="absolute inset-0 rounded-full shadow-[0_0_30px_10px] shadow-green-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, times: [0, 0.5, 1] }}
              />
            )}
          </AnimatePresence>

          <HonourAura {...ascNft} />

          {/* Central Seal */}
          <motion.div className="relative z-10 w-32 h-32 bg-slate-900/80 rounded-full flex flex-col items-center justify-center border-2 border-slate-700 backdrop-blur-sm">
            <StateIcon className="w-8 h-8 text-slate-300 mb-1" />
            <div className="text-4xl font-bold text-white tracking-tighter">{ascNft.sincerity_score}</div>
            <div className="text-xs text-slate-400">Sincerity</div>
          </motion.div>

          {/* Gate at bottom */}
          <motion.div className="absolute bottom-6 z-20 flex flex-col items-center gap-1">
            <GateIcon className={cn('w-6 h-6', config.gateColor)} />
            <span className="text-xs text-slate-400">{config.label}</span>
          </motion.div>
        </motion.div>
      </motion.div>
      <div className="text-center mt-4">
         <p className="text-sm text-slate-400">Total Attestations: <span className="font-bold text-white">{ascNft.total_attestations || 0}</span></p>
         <p className="text-sm text-slate-400">Average Honour Weight: <span className="font-bold text-white">{ascNft.average_honour_weight || 0}</span></p>
      </div>
    </div>
  );
}