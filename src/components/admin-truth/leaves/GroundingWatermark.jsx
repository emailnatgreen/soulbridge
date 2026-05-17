import React from 'react';
import { AlertTriangle, ShieldAlert, HelpCircle } from 'lucide-react';

const GRADE_CONFIG = {
  LOW: {
    icon: ShieldAlert,
    border: 'border-red-500/40',
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    label: 'LOW GROUNDING — Claims below may contain LLM-generated specifics not verified against database',
    stripe: 'bg-red-500/8',
  },
  MEDIUM: {
    icon: AlertTriangle,
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    label: 'MEDIUM GROUNDING — Some claims verified, others inferred. Cross-check specifics before citing.',
    stripe: 'bg-amber-500/6',
  },
};

export default function GroundingWatermark({ grade, confidence }) {
  if (!grade || grade === 'HIGH') return null;

  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.MEDIUM;
  const Icon = config.icon;

  return (
    <div className={`rounded-md border ${config.border} ${config.bg} px-3 py-2 flex items-start gap-2 mb-2`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${config.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-medium ${config.text}`}>{config.label}</p>
        {confidence !== undefined && (
          <p className="text-[9px] text-slate-500 mt-0.5">
            Effective confidence: {confidence}% · Grounding grade: {grade}
          </p>
        )}
      </div>
    </div>
  );
}

export function GroundingStripe({ grade }) {
  if (!grade || grade === 'HIGH') return null;
  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.MEDIUM;
  return (
    <div className={`absolute inset-0 pointer-events-none rounded-lg ${config.stripe}`} />
  );
}