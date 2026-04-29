import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, Coins, Chrome, Zap, Clock, FileJson, Layers } from 'lucide-react';

const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1'];

function StatItem({ icon: Icon, label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-white/40 text-[10px]">
        <Icon className={`w-3 h-3 ${color}`} />
        {label}
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-white/20 text-[9px]">{sub}</p>}
    </div>
  );
}

export default function SkillPerformancePanel() {
  // Fetch all Chrome Skill widgets (have chrome_skill_instructions)
  const { data: allWidgets = [] } = useQuery({
    queryKey: ['allWidgets'],
    queryFn: () => base44.entities.Widget.list('-created_date', 200),
    staleTime: 30000,
  });

  // Fetch service usage logs for Chrome Skills
  const { data: usageLogs = [] } = useQuery({
    queryKey: ['chromeSkillUsage'],
    queryFn: async () => {
      const [workshopLogs, serviceLogs] = await Promise.all([
        base44.entities.ServiceUsageLog.filter({ service_id: 'workshop_nft_chrome_skill' }, '-created_date', 100).catch(() => []),
        base44.entities.ServiceUsageLog.list('-created_date', 200).catch(() => []),
      ]);
      return [...workshopLogs, ...serviceLogs];
    },
    staleTime: 30000,
  });

  // Fetch payment logs
  const { data: paymentLogs = [] } = useQuery({
    queryKey: ['chromeSkillPayments'],
    queryFn: () => base44.entities.PaymentUsageLog.list('-created_date', 200).catch(() => []),
    staleTime: 30000,
  });

  // Derive metrics from real data
  const chromeSkills = allWidgets.filter(w => w.chrome_skill_instructions?.length > 0);
  const mintedSkills = chromeSkills.filter(w => w.mint_status === 'minted_mainnet');
  const draftSkills = chromeSkills.filter(w => w.mint_status === 'draft');
  const webmcpReady = chromeSkills.filter(w => w.webmcp_manifest);
  const totalSkillDefs = chromeSkills.reduce((sum, w) => sum + (w.chrome_skill_instructions?.length || 0), 0);
  const diditGated = chromeSkills.filter(w => w.chrome_skill_instructions?.some(s => s.requires_didit_verification));
  const multiTabSkills = chromeSkills.filter(w => w.chrome_skill_instructions?.some(s => s.multi_tab));

  const chromePayments = paymentLogs.filter(p => p.service_id?.includes('chrome_skill'));
  const totalRevenue = chromePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Status distribution for pie chart
  const statusData = [
    { name: 'Minted', value: mintedSkills.length, fill: '#10b981' },
    { name: 'Draft', value: draftSkills.length, fill: '#64748b' },
    { name: 'Prepared', value: chromeSkills.filter(w => w.mint_status === 'prepared').length, fill: '#3b82f6' },
    { name: 'Failed', value: chromeSkills.filter(w => w.mint_status === 'failed').length, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  // Category breakdown for bar chart — use Chrome Skill categories from skill_category field
  const categoryMap = {};
  chromeSkills.forEach(w => {
    (w.chrome_skill_instructions || []).forEach(s => {
      const cat = s.skill_category || w.category || 'other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    count: value,
  }));

  // Monthly creation trend
  const monthlyMap = {};
  chromeSkills.forEach(w => {
    const d = new Date(w.created_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyData = Object.entries(monthlyMap).sort().map(([month, count]) => ({ month, count }));

  const hasData = chromeSkills.length > 0;

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-emerald-400" />
          Chrome Skill Performance
          <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-300 ml-auto">
            {chromeSkills.length} skill NFT{chromeSkills.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatItem icon={Chrome} label="Chrome Skills" value={chromeSkills.length} color="text-emerald-400" sub={`${mintedSkills.length} minted on XRPL`} />
          <StatItem icon={Zap} label="Total Skill Defs" value={totalSkillDefs} color="text-cyan-400" sub={`across ${chromeSkills.length} NFTs`} />
          <StatItem icon={FileJson} label="WebMCP Ready" value={webmcpReady.length} color="text-purple-400" sub="manifest generated" />
          <StatItem icon={Coins} label="Revenue" value={`${totalRevenue.toFixed(2)}`} color="text-amber-400" sub="RLUSD from Chrome Skills" />
        </div>

        {!hasData ? (
          <div className="text-center py-8 space-y-2">
            <Chrome className="w-8 h-8 text-emerald-400/30 mx-auto" />
            <p className="text-white/30 text-xs">No Chrome Skills created yet</p>
            <p className="text-white/20 text-[10px]">Create your first Chrome Skill NFT to see performance data here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mint Status Distribution */}
            {statusData.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/40 text-[10px] font-medium">Mint Status</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-3 justify-center flex-wrap">
                  {statusData.map(d => (
                    <span key={d.name} className="flex items-center gap-1 text-[9px] text-white/40">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Creation Trend */}
            {monthlyData.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/40 text-[10px] font-medium">Creation Trend</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Stats */}
        {hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
              <p className="text-purple-300 text-lg font-bold">{diditGated.length}</p>
              <p className="text-white/30 text-[8px]">DIDit Verified</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
              <p className="text-blue-300 text-lg font-bold">{multiTabSkills.length}</p>
              <p className="text-white/30 text-[8px]">Multi-tab Skills</p>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2 text-center">
              <p className="text-indigo-300 text-lg font-bold">{Object.keys(categoryMap).length}</p>
              <p className="text-white/30 text-[8px]">Skill Categories</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
              <p className="text-amber-300 text-lg font-bold">{chromeSkills.filter(w => w.cost_per_stream_interval > 0).length}</p>
              <p className="text-white/30 text-[8px]">Streaming Fees</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}