import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const ACTIVITY_TYPE_CONFIG = {
  earned: { label: 'Earned', color: 'bg-green-100 text-green-700', icon: ArrowUpRight, iconColor: 'text-green-500' },
  spent: { label: 'Spent', color: 'bg-red-100 text-red-700', icon: ArrowDownRight, iconColor: 'text-red-500' },
  treasury_deposit: { label: 'Treasury Deposit', color: 'bg-blue-100 text-blue-700', icon: ArrowUpRight, iconColor: 'text-blue-500' },
  treasury_withdrawal: { label: 'Treasury Withdrawal', color: 'bg-amber-100 text-amber-700', icon: ArrowDownRight, iconColor: 'text-amber-500' },
  traded: { label: 'Traded', color: 'bg-purple-100 text-purple-700', icon: Activity, iconColor: 'text-purple-500' },
  resource_acquired: { label: 'Resource Acquired', color: 'bg-indigo-100 text-indigo-700', icon: ArrowUpRight, iconColor: 'text-indigo-500' },
  resource_sold: { label: 'Resource Sold', color: 'bg-pink-100 text-pink-700', icon: ArrowDownRight, iconColor: 'text-pink-500' },
};

export default function RippleTreasuryPanel({ treasuries, economicActivity }) {
  const totalDeposits = economicActivity.filter(e => e.activity_type === 'treasury_deposit').reduce((s, e) => s + e.amount, 0);
  const totalWithdrawals = economicActivity.filter(e => e.activity_type === 'treasury_withdrawal').reduce((s, e) => s + e.amount, 0);
  const totalEarned = economicActivity.filter(e => e.activity_type === 'earned').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Treasury Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {treasuries.map(treasury => (
          <Card key={treasury.id} className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <Badge className={`text-xs ${treasury.access_level === 'admin_only' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {treasury.access_level?.replace('_', ' ')}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{treasury.name}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{(treasury.total_balance || 0).toFixed(4)} <span className="text-sm font-normal text-green-600">XRP</span></p>
              <p className="text-xs text-gray-500 mb-3">{treasury.purpose}</p>
              <div className="grid grid-cols-3 gap-2 text-center border-t border-green-200 pt-3">
                <div>
                  <p className="text-xs text-gray-500">Deposits</p>
                  <p className="text-sm font-semibold text-green-600">{(treasury.total_deposits || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Withdrawals</p>
                  <p className="text-sm font-semibold text-red-500">{(treasury.total_withdrawals || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Txns</p>
                  <p className="text-sm font-semibold text-gray-700">{treasury.transaction_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Economy Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-green-200 text-center">
          <CardContent className="pt-4 pb-4">
            <p className="text-xl font-bold text-green-600">{totalDeposits.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Deposited (XRP)</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-red-200 text-center">
          <CardContent className="pt-4 pb-4">
            <p className="text-xl font-bold text-red-500">{totalWithdrawals.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Withdrawn (XRP)</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-blue-200 text-center">
          <CardContent className="pt-4 pb-4">
            <p className="text-xl font-bold text-blue-600">{totalEarned.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Village Earned (XRP)</p>
          </CardContent>
        </Card>
      </div>

      {/* Economic Activity Feed */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            Economic Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {economicActivity.slice(0, 15).map(activity => {
              const conf = ACTIVITY_TYPE_CONFIG[activity.activity_type] || ACTIVITY_TYPE_CONFIG.earned;
              const Icon = conf.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${conf.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-700 truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm font-bold ${activity.activity_type.includes('withdrawal') || activity.activity_type === 'spent' ? 'text-red-600' : 'text-green-600'}`}>
                          {activity.activity_type.includes('withdrawal') || activity.activity_type === 'spent' ? '-' : '+'}{(activity.amount || 0).toFixed(4)} XRP
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${conf.color}`}>{conf.label}</Badge>
                      {activity.created_date && (
                        <span className="text-xs text-gray-400">{format(new Date(activity.created_date), 'dd MMM HH:mm')}</span>
                      )}
                      {activity.status && (
                        <Badge className={`text-xs ${activity.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{activity.status}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}