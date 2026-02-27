import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, Zap, BarChart2 } from 'lucide-react';

const STYLE_LABELS = {
  hands_on: 'Hands-On',
  coaching: 'Coaching',
  advisory: 'Advisory',
  collaborative: 'Collaborative',
  socratic: 'Socratic',
  directive: 'Directive'
};

export default function MatchInsightsPanel({ styleSuccessRates = {} }) {
  const entries = Object.entries(styleSuccessRates)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const topStyle = entries[0];

  return (
    <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          Feedback-Informed Match Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-white/50">
          Match scores now incorporate real session feedback — satisfaction ratings, mentee progress, and completion rates.
        </p>

        <div className="space-y-2">
          <div className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Mentorship Style Satisfaction (from feedback)
          </div>
          {entries.map(([style, score]) => (
            <div key={style} className="flex items-center gap-2">
              <div className="text-xs text-white/70 w-24 flex-shrink-0">{STYLE_LABELS[style] || style}</div>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="text-xs text-white/60 w-8 text-right">{score.toFixed(0)}</div>
              {style === topStyle[0] && (
                <Badge className="bg-purple-500/20 text-purple-300 text-xs py-0">Top</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}