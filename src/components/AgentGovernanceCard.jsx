import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Wallet
} from 'lucide-react';
import { cn } from "@/lib/utils";
import HonorAdjustDialog from './HonorAdjustDialog';
import WarningDialog from './WarningDialog';
import PermissionsDialog from './PermissionsDialog';

export default function AgentGovernanceCard({ agent, wallets, highlightConcerns }) {
  const [showHonor, setShowHonor] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const wallet = wallets.find(w => w.id === agent.wallet_id);
  const honorScore = agent.honor_score || 100;

  const getHonorColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-300 border-green-500/30',
      probation: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      suspended: 'bg-red-500/20 text-red-300 border-red-500/30',
      dormant: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    return colors[status] || colors.active;
  };

  const isConcerning = honorScore < 60 || 
    (agent.warnings?.length || 0) > 0 ||
    agent.status === 'probation' ||
    agent.status === 'suspended';

  return (
    <>
      <Card className={cn(
        "bg-white/5 backdrop-blur-xl border-white/10 transition-all hover:bg-white/[0.07]",
        highlightConcerns && isConcerning && "border-red-500/30"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-medium text-white truncate">
                  {agent.name}
                </h3>
                <Badge className={cn("border", getStatusColor(agent.status))}>
                  {agent.status}
                </Badge>
                {agent.role && (
                  <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                    {agent.role}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-white/60 mb-3 line-clamp-2">
                {agent.purpose}
              </p>

              <div className="flex flex-wrap gap-3 text-sm">
                {/* Honor Score */}
                <div className="flex items-center gap-2">
                  <span className="text-white/40">Honor:</span>
                  <span className={cn("font-medium", getHonorColor(honorScore))}>
                    {honorScore}
                  </span>
                  {honorScore < 60 && (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  {honorScore >= 90 && (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  )}
                </div>

                {/* Warnings */}
                {(agent.warnings?.length || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300">
                      {agent.warnings.length} warning{agent.warnings.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Wallet */}
                {wallet && (
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-white/40" />
                    <span className="text-white/60 font-mono text-xs">
                      {wallet.classic_address.slice(0, 10)}...
                    </span>
                  </div>
                )}

                {/* Transactions */}
                <div className="flex items-center gap-2">
                  <span className="text-white/40">Transactions:</span>
                  <span className="text-white/60">{agent.total_transactions || 0}</span>
                </div>
              </div>

              {/* Permissions Preview */}
              {agent.permissions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {agent.permissions.can_create_agents && (
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                      Can Create
                    </Badge>
                  )}
                  {agent.permissions.can_access_treasury && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-300">
                      Treasury Access
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHonor(true)}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Honor
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWarning(true)}
                className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Warn
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPermissions(true)}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Permissions
              </Button>
            </div>
          </div>

          {/* Recent Warnings */}
          {agent.warnings && agent.warnings.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-2">Recent Warnings:</p>
              {agent.warnings.slice(-2).map((warning, idx) => (
                <div key={idx} className="text-xs text-yellow-300/80 mb-1">
                  • {warning.reason} ({new Date(warning.date).toLocaleDateString()})
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HonorAdjustDialog 
        agent={agent}
        open={showHonor}
        onClose={() => setShowHonor(false)}
      />
      <WarningDialog 
        agent={agent}
        open={showWarning}
        onClose={() => setShowWarning(false)}
      />
      <PermissionsDialog 
        agent={agent}
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
    </>
  );
}