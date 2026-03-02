import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, AlertTriangle, Shield, User } from 'lucide-react';

const severityColor = {
  Low: 'bg-green-100 text-green-800 border-green-300',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  High: 'bg-orange-100 text-orange-800 border-orange-300',
  Critical: 'bg-red-100 text-red-800 border-red-300',
};

const statusColor = {
  Identified: 'bg-gray-100 text-gray-700',
  Assessed: 'bg-blue-100 text-blue-700',
  Mitigating: 'bg-purple-100 text-purple-700',
  Monitoring: 'bg-cyan-100 text-cyan-700',
  Closed: 'bg-green-100 text-green-700',
};

const categoryIcon = {
  Technical: '⚙️', Security: '🔐', Operational: '🏗️',
  Compliance: '📋', Financial: '💰', Strategic: '🎯', Web3: '⛓️',
};

export default function RiskCard({ risk, onEdit, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-all">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{categoryIcon[risk.category] || '⚠️'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">{risk.name}</h3>
                <Badge className={`text-xs border ${severityColor[risk.severity]}`}>{risk.severity}</Badge>
                <Badge className={`text-xs ${statusColor[risk.status]}`}>{risk.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span>{risk.category}</span>
                <span>·</span>
                <span>Likelihood: {risk.likelihood}</span>
                {risk.project_name && <><span>·</span><span>📁 {risk.project_name}</span></>}
                {risk.owner_name && <><span>·</span><span><User className="w-3 h-3 inline" /> {risk.owner_name}</span></>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <Button size="sm" variant="ghost" onClick={() => onEdit(risk)} className="text-xs h-7">Edit</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-7 w-7 p-0">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {risk.description && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Description</p>
                <p className="text-xs text-gray-700">{risk.description}</p>
              </div>
            )}
            {risk.impact_description && (
              <div>
                <p className="text-xs font-semibold text-orange-600 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Impact</p>
                <p className="text-xs text-gray-700">{risk.impact_description}</p>
              </div>
            )}
            {risk.mitigation_plan && (
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Mitigation Plan</p>
                <p className="text-xs text-gray-700">{risk.mitigation_plan}</p>
              </div>
            )}
            {risk.contingency_plan && (
              <div>
                <p className="text-xs font-semibold text-purple-600 mb-1">Contingency Plan</p>
                <p className="text-xs text-gray-700">{risk.contingency_plan}</p>
              </div>
            )}
            {onStatusChange && (
              <div className="flex flex-wrap gap-2 pt-1">
                {['Identified','Assessed','Mitigating','Monitoring','Closed'].map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={risk.status === s ? 'default' : 'outline'}
                    className="text-xs h-6"
                    onClick={() => onStatusChange(risk, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}