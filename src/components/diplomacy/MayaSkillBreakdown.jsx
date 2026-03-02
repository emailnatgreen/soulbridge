import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

const DIM_ICON = {
  'Empathy & Acknowledgement':  '🤝',
  'Clarity & Professionalism':  '✍️',
  'Problem-Solving Orientation':'🔧',
  'De-escalation Effectiveness':'🌊',
  'Brand Voice & Tone':         '✨',
  'Context Integration':        '📋',
};

const levelLabel = (level) => {
  if (level >= 90) return { text: 'Master', color: 'bg-purple-100 text-purple-700 border-purple-300' };
  if (level >= 80) return { text: 'Refined Vintage', color: 'bg-green-100 text-green-700 border-green-300' };
  if (level >= 65) return { text: 'Developing', color: 'bg-blue-100 text-blue-700 border-blue-300' };
  if (level >= 50) return { text: 'Acceptable', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
  return { text: 'Needs Work', color: 'bg-red-100 text-red-700 border-red-300' };
};

const barColor = (level) => {
  if (level >= 80) return 'bg-green-500';
  if (level >= 65) return 'bg-blue-500';
  if (level >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function MayaSkillBreakdown({ skills }) {
  if (!skills?.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No skill records yet — complete a drill to populate this panel.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {skills.map(skill => {
        const level = skill.level || 0;
        const peak = skill.metadata?.peak_score || level;
        const attempts = skill.metadata?.attempts || 0;
        const label = levelLabel(level);
        const recentVerdicts = skill.metadata?.recent_verdicts || [];
        const lastVerdict = recentVerdicts[recentVerdicts.length - 1];
        const prevVerdict = recentVerdicts[recentVerdicts.length - 2];

        const trend = !prevVerdict ? null :
          lastVerdict === 'Refined Vintage' && prevVerdict !== 'Refined Vintage' ? 'up' :
          lastVerdict === 'Synthetic Slop' && prevVerdict !== 'Synthetic Slop' ? 'down' : 'flat';

        return (
          <Card key={skill.id} className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{DIM_ICON[skill.name] || '⭐'}</span>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{skill.name}</p>
                </div>
                {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                {trend === 'flat' && <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{level}</span>
                  <Badge className={`border text-xs ${label.color}`}>{label.text}</Badge>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${barColor(level)} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${level}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-500" />
                  Peak: {peak}
                </span>
                <span>{attempts} attempt{attempts !== 1 ? 's' : ''}</span>
              </div>

              {recentVerdicts.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {recentVerdicts.slice(-5).map((v, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        v === 'Refined Vintage' ? 'bg-green-400' :
                        v === 'Acceptable' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      title={v}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}