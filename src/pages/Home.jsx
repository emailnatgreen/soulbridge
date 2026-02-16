import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Plus, MessageCircle, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import TransactionList from '../components/TransactionList';

export default function Home() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 50),
  });

  const stats = {
    total: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">
                Soul<span className="font-semibold">Bridge</span>
              </h1>
              <p className="text-sm text-purple-300/60">XRP Payment Platform</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('Governance')}>
                <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                  <Shield className="w-4 h-4 mr-2" />
                  Governance
                </Button>
              </Link>
              <Link to={createPageUrl('Axi')}>
                <Button variant="outline" className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Talk to Axi
                </Button>
              </Link>
              <Link to={createPageUrl('Agents')}>
                <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                  <Users className="w-4 h-4 mr-2" />
                  Agents
                </Button>
              </Link>
              <Link to={createPageUrl('Wallets')}>
                <Button variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallets
                </Button>
              </Link>
              <Link to={createPageUrl('TransactionHistory')}>
                <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/5">
                  <Activity className="w-4 h-4 mr-2" />
                  History
                </Button>
              </Link>
              <Link to={createPageUrl('Send')}>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2" />
                  Send XRP
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-300/80">Total Volume</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">
                {stats.total.toFixed(2)} <span className="text-lg text-purple-300/60">XRP</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-300/80">Completed</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.completed}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-yellow-300/80">Pending</CardTitle>
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Activity className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={transactions} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}