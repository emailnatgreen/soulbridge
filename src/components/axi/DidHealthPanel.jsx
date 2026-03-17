import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Fingerprint, CheckCircle, AlertTriangle, XCircle, Activity, TrendingUp } from 'lucide-react';

const STATUS_CONFIG = {
  healthy:  { color: 'text-green-400',  bg: 'bg-green-900/20',  badge: 'bg-green-600' },
  warning:  { color: 'text-amber-400',  bg: 'bg-amber-900/20',  badge: 'bg-amber-500' },
  degraded: { color: 'text-orange-400', bg: 'bg-orange-900/20', badge: 'bg-orange-600' },
  critical: { color: 'text-red-400',    bg: 'bg-red-900/20',    badge: 'bg-red-600' },
};

export default function DidHealthPanel() {
  const [didHealth, setDidHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load from sessionStorage
    const stored = sessionStorage.getItem('didHealthSnapshot');
    if (stored) {
      try {
        setDidHealth(JSON.parse(stored));
        setLoading(false);
      } catch (err) {
        console.error('Failed to parse DID health data:', err);
      }
    }

    // Listen for updates from other tabs/windows
    if (window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('did-health-updates');
        channel.onmessage = (event) => {
          setDidHealth(event.data);
          setLoading(false);
        };
        return () => channel.close();
      } catch (err) {
        console.log('BroadcastChannel not available');
      }
    }
  }, []);

  if (loading || !didHealth) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-indigo-400" />
          DID Health Network
        </h3>
        <div className="text-sm text-slate-400">Waiting for DID Health Dashboard...</div>
      </div>
    );
  }

  const overallCfg = STATUS_CONFIG[didHealth.overallStatus];
  const OverallIcon = 
    didHealth.overallStatus === 'healthy' ? CheckCircle :
    didHealth.overallStatus === 'critical' ? XCircle :
    AlertTriangle;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-indigo-400" />
          DID Health Network
        </h3>
        <Link to="/DIDHealthDashboard">
          <Button size="sm" variant="ghost" className="text-indigo-300 hover:text-white text-xs h-7">
            Full Dashboard →
          </Button>
        </Link>
      </div>

      {/* Overall Health */}
      <div className={`rounded-lg p-3 border border-white/10 ${overallCfg.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <OverallIcon className={`w-5 h-5 ${overallCfg.color}`} />
            <span className="text-sm font-semibold text-white capitalize">{didHealth.overallStatus}</span>
          </div>
          <div className={`text-2xl font-bold ${overallCfg.color}`}>{didHealth.avgScore}%</div>
        </div>
        <div className="text-xs text-slate-300">Average Health Score</div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-900/50 rounded-lg p-2 border border-white/5">
          <div className="text-xs text-slate-400">Total DIDs</div>
          <div className="text-lg font-bold text-white">{didHealth.totalDIDs}</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-2 border border-green-500/20">
          <div className="text-xs text-slate-400">Healthy</div>
          <div className="text-lg font-bold text-green-400">{didHealth.healthy}</div>
        </div>
        <div className="bg-amber-900/20 rounded-lg p-2 border border-amber-500/20">
          <div className="text-xs text-slate-400">Warning</div>
          <div className="text-lg font-bold text-amber-400">{didHealth.warning}</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-2 border border-red-500/20">
          <div className="text-xs text-slate-400">Critical</div>
          <div className="text-lg font-bold text-red-400">{didHealth.critical}</div>
        </div>
      </div>

      {/* DID List */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-semibold">Individual DIDs</div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {didHealth.healthReports.map((report, idx) => {
            const cfg = STATUS_CONFIG[report.status];
            return (
              <div key={idx} className={`rounded-lg p-2 border border-white/5 ${cfg.bg} text-xs`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
                    <span className="text-slate-300 truncate">{report.linkedAgent}</span>
                  </div>
                  <Badge className={`${cfg.badge} text-white border-0 text-[10px] shrink-0`}>
                    {report.score}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="text-xs text-slate-500 p-2 bg-slate-900/30 rounded-lg border border-white/5">
        Last updated: {new Date(didHealth.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}