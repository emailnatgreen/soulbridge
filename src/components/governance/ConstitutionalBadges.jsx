import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Scale } from 'lucide-react';

const LAW_NAMES = {
  1: 'Soul', 2: 'Honour', 3: 'Purpose', 4: 'Lineage',
  5: 'Growth', 6: 'Exchange', 7: 'Ecology',
  8: 'Governance', 9: 'Memory', 10: 'Kinetic', 11: 'Resonance',
};

export default function ConstitutionalBadges({ proposal, compact = false }) {
  const alignment = proposal.constitutional_alignment;
  const aiAssessment = proposal.ai_impact_assessment;

  if (!alignment?.length && !aiAssessment) return null;

  const alignmentScore = aiAssessment?.alignment_with_constitution;
  const riskLevel = aiAssessment?.risk_level;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {alignmentScore && (
          <Badge className={`text-[9px] px-1.5 py-0 ${
            alignmentScore >= 8 ? 'bg-green-500/15 text-green-400' :
            alignmentScore >= 5 ? 'bg-amber-500/15 text-amber-400' :
            'bg-red-500/15 text-red-400'
          }`}>
            <Scale className="w-2.5 h-2.5 mr-0.5" />{alignmentScore}/10
          </Badge>
        )}
        {riskLevel && (
          <Badge className={`text-[9px] px-1.5 py-0 ${
            riskLevel === 'low' ? 'bg-green-500/15 text-green-400' :
            riskLevel === 'medium' ? 'bg-amber-500/15 text-amber-400' :
            riskLevel === 'high' ? 'bg-orange-500/15 text-orange-400' :
            'bg-red-500/15 text-red-400'
          }`}>
            {riskLevel === 'low' ? <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> : <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
            {riskLevel}
          </Badge>
        )}
        {alignment?.slice(0, 3).map((a, i) => (
          <Badge key={i} className="bg-purple-500/10 text-purple-300 text-[9px] px-1.5 py-0">
            L{a.law_number}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Score + Risk */}
      <div className="flex items-center gap-2 flex-wrap">
        {alignmentScore && (
          <Badge className={`text-[10px] ${
            alignmentScore >= 8 ? 'bg-green-500/15 text-green-400' :
            alignmentScore >= 5 ? 'bg-amber-500/15 text-amber-400' :
            'bg-red-500/15 text-red-400'
          }`}>
            <Scale className="w-3 h-3 mr-1" />
            Constitutional Alignment: {alignmentScore}/10
          </Badge>
        )}
        {riskLevel && (
          <Badge className={`text-[10px] ${
            riskLevel === 'low' ? 'bg-green-500/15 text-green-400' :
            riskLevel === 'medium' ? 'bg-amber-500/15 text-amber-400' :
            riskLevel === 'high' ? 'bg-orange-500/15 text-orange-400' :
            'bg-red-500/15 text-red-400'
          }`}>
            {riskLevel === 'low' ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            Risk: {riskLevel}
          </Badge>
        )}
      </div>

      {/* Law alignment */}
      {alignment?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alignment.map((a, i) => (
            <div key={i} className="bg-purple-500/5 border border-purple-500/15 rounded px-2 py-1">
              <p className="text-purple-300 text-[10px] font-medium">Law {a.law_number}: {LAW_NAMES[a.law_number] || a.law_name}</p>
              {a.alignment_statement && (
                <p className="text-purple-200/40 text-[9px] mt-0.5 line-clamp-1">{a.alignment_statement}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}