import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  Activity,
  Users,
  Award,
  Shield,
  AlertCircle
} from 'lucide-react';

export default function ReputationBreakdown({ userDID, reputationScore, endorsements, trustReceived }) {
  if (!reputationScore) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No reputation data available yet</p>
          <p className="text-sm text-gray-400 mt-1">Build trust and receive endorsements to generate your reputation score</p>
        </CardContent>
      </Card>
    );
  }

  const scores = [
    {
      label: 'Activity Score',
      value: reputationScore.activity_score,
      icon: Activity,
      color: 'blue',
      description: 'Based on your activity and engagement'
    },
    {
      label: 'Reliability Score',
      value: reputationScore.reliability_score,
      icon: Shield,
      color: 'green',
      description: 'How reliable and consistent you are'
    },
    {
      label: 'Engagement Score',
      value: reputationScore.engagement_score,
      icon: Users,
      color: 'purple',
      description: 'Community engagement and participation'
    }
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustLevelColor = (level) => {
    const colors = {
      'verified': 'bg-green-600',
      'trusted': 'bg-blue-600',
      'established': 'bg-purple-600',
      'new': 'bg-yellow-600',
      'unverified': 'bg-gray-600'
    };
    return colors[level] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Overall Reputation Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-6xl font-bold ${getScoreColor(reputationScore.overall_score)}`}>
                {reputationScore.overall_score}
              </div>
              <div className="text-sm text-gray-600 mt-1">out of 100</div>
            </div>
            <div className="text-right">
              <Badge className={`${getTrustLevelColor(reputationScore.trust_level)} text-lg px-4 py-2`}>
                {reputationScore.trust_level.toUpperCase()}
              </Badge>
              <div className="text-sm text-gray-600 mt-2">Trust Level</div>
            </div>
          </div>
          <Progress value={reputationScore.overall_score} className="h-3" />
        </CardContent>
      </Card>

      {/* Component Scores */}
      <div className="grid grid-cols-3 gap-4">
        {scores.map((score) => {
          const Icon = score.icon;
          return (
            <Card key={score.label}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-3 text-${score.color}-600`} />
                  <div className={`text-3xl font-bold ${getScoreColor(score.value)}`}>
                    {score.value}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-2">{score.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{score.description}</div>
                  <Progress value={score.value} className="mt-3 h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reputation Metrics */}
      {reputationScore.metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Metrics</CardTitle>
            <CardDescription>Factors contributing to your reputation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(reputationScore.metrics).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xl font-bold text-gray-900 mt-1">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {reputationScore.badges && reputationScore.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-purple-600" />
              Reputation Badges
            </CardTitle>
            <CardDescription>Achievements you've earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {reputationScore.badges.map((badge, idx) => (
                <div key={idx} className="p-3 border rounded-lg bg-white text-center">
                  <div className="text-3xl mb-2">{badge.icon || '🏆'}</div>
                  <div className="font-semibold text-sm">{badge.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(badge.earned_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Warnings */}
      <div className="grid grid-cols-2 gap-4">
        {/* Strengths */}
        {reputationScore.strengths && reputationScore.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-green-600" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {reputationScore.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Warnings */}
        {reputationScore.warnings && reputationScore.warnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {reputationScore.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-600 mt-0.5">⚠</span>
                    <span className="text-gray-700">{warning}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last calculated: {new Date(reputationScore.last_calculated).toLocaleString()}
        {' · '}
        Algorithm version: {reputationScore.calculation_version}
      </div>
    </div>
  );
}