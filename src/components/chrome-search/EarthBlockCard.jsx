import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, HeartHandshake } from 'lucide-react';

/**
 * Shown when a query was blocked by the Earth safety gate.
 * Explains the block and shows the engine's +1 honour reward.
 */
export default function EarthBlockCard({ blockReason, honourDelta }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-red-950/30 border border-red-500/30 rounded-xl p-5 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-300 mb-1">Search Blocked — Earth Safety Gate</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {blockReason || 'This query was flagged by the safety pipeline. The search engine protects the community by filtering harmful or exploitative queries.'}
          </p>
          {honourDelta > 0 && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">
                Engine received <span className="font-bold">+{honourDelta}</span> honour for protecting the community.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}