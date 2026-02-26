import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MentorshipProposalCard({
  relationship,
  otherAgent,
  isMentor,
  onAccept,
  onDecline,
  isLoading
}) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-yellow-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <Card className={cn('border', getScoreBg(relationship.match_quality_score))}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {isMentor ? 'Mentee Seeking Guidance' : 'Mentor Match Recommended'}
            </CardTitle>
            <CardDescription>
              {otherAgent?.name || 'Loading...'}
            </CardDescription>
          </div>
          <div className={cn('text-2xl font-bold', getScoreColor(relationship.match_quality_score))}>
            {relationship.match_quality_score}
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Focus Areas */}
        {relationship.focus_areas && relationship.focus_areas.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Focus Areas</h4>
            <div className="flex flex-wrap gap-2">
              {relationship.focus_areas.map((area, idx) => (
                <Badge key={idx} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Match Reasoning */}
        {relationship.ai_match_reasoning && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex gap-2 items-start">
              <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">AI Insight</h4>
                <p className="text-sm text-slate-700">{relationship.ai_match_reasoning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Match Breakdown */}
        {relationship.match_criteria && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Match Criteria</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(relationship.match_criteria).map(([key, value]) => (
                <div key={key} className="bg-slate-100 rounded p-2">
                  <div className="text-slate-600">{key.replace(/_/g, ' ')}</div>
                  <div className="font-semibold">{Math.round(value)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        {relationship.goals && relationship.goals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Initial Goals</h4>
            <ul className="space-y-1">
              {relationship.goals.slice(0, 3).map((goal, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-blue-600">•</span>
                  {goal.goal}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onAccept}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isMentor ? 'Accept Mentee' : 'Accept Mentor'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onDecline}
            disabled={isLoading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}