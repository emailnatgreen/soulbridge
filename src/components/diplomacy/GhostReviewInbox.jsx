import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, CheckCircle2, Star, Flame } from 'lucide-react';

const DIFFICULTY_COLOR = {
  Easy:        'bg-green-100 text-green-700 border-green-200',
  Medium:      'bg-yellow-100 text-yellow-700 border-yellow-200',
  Hard:        'bg-orange-100 text-orange-700 border-orange-200',
  'Fire Drill':'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICON = {
  'Pending Response':   <Clock className="w-4 h-4 text-gray-400" />,
  'Response Submitted': <MessageSquare className="w-4 h-4 text-blue-500" />,
  'Evaluated':          <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

export default function GhostReviewInbox({ reviews, selectedId, onSelect }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No ghost reviews assigned</p>
        <p className="text-sm mt-1">Generate some to start training</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reviews.map(r => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className={`w-full text-left p-3 rounded-lg border transition-all ${
            selectedId === r.id
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5">{STATUS_ICON[r.status]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{r.title}</p>
              <p className="text-xs text-gray-500 truncate">{r.simulated_customer_name}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className={`${DIFFICULTY_COLOR[r.difficulty_level]} border text-xs`}>
                  {r.difficulty_level === 'Fire Drill' && <Flame className="w-2.5 h-2.5 mr-1" />}
                  {r.difficulty_level}
                </Badge>
                {r.ai_score != null && (
                  <span className="text-xs text-gray-500 font-medium">Score: {r.ai_score}/100</span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}