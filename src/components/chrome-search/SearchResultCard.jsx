import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import HonourBadge from './HonourBadge';
import SafetyBadge from './SafetyBadge';
import { cn } from '@/lib/utils';

export default function SearchResultCard({ result, meta, safetyFlags, outcomeStatus }) {
  const alignmentScore = meta?.alignment_score ?? 0;
  const rankingScore = result?.ranking_score ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm"
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <HonourBadge score={alignmentScore} />
        <SafetyBadge safetyFlags={safetyFlags} outcomeStatus={outcomeStatus} />
        {rankingScore > 0 && (
          <span className="text-xs text-slate-500 ml-auto">
            Rank Score: {rankingScore}
          </span>
        )}
      </div>

      {/* Result content */}
      <div className="prose prose-sm prose-invert max-w-none
        prose-headings:text-slate-200 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
        prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-1
        prose-strong:text-slate-200
        prose-li:text-slate-300 prose-li:my-0.5
        prose-code:bg-slate-800 prose-code:text-teal-300 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline
      ">
        <ReactMarkdown>{result?.structured_result || 'No result returned.'}</ReactMarkdown>
      </div>

      {/* Score bar */}
      {alignmentScore > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>7-Leaf Alignment</span>
            <span>{Math.round(alignmentScore * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                alignmentScore >= 0.8 ? 'bg-teal-500' : alignmentScore >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(alignmentScore * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}