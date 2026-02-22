import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Brain, TrendingUp, Shield, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletAIInsights({ wallet, transactions }) {
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['wallet-insights', wallet.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeWalletActivity', {
        wallet_id: wallet.id,
        transactions: transactions || []
      });
      return response.data;
    },
    enabled: false
  });

  const setupTrustline = useMutation({
    mutationFn: async ({ currency, issuer }) => {
      const response = await base44.functions.invoke('autoSetupTrustline', {
        wallet_id: wallet.id,
        currency,
        issuer
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`TrustLine set for ${data.currency}`);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
    onError: (error) => {
      toast.error('Failed to set trustline: ' + error.message);
    }
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await refetch();
    setAnalyzing(false);
  };

  const getRiskColor = (level) => {
    switch(level?.toLowerCase()) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (!insights && !isLoading && !analyzing) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="py-8 text-center">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h3 className="text-white font-medium mb-2">AI Wallet Insights</h3>
          <p className="text-white/60 text-sm mb-4">Get intelligent analysis of your wallet activity</p>
          <Button 
            onClick={handleAnalyze}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Analyze with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || analyzing) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
          <p className="text-white/60 text-sm">AI analyzing your wallet activity...</p>
        </CardContent>
      </Card>
    );
  }

  const analysis = insights?.analysis;

  return (
    <div className="space-y-4">
      {/* Risk Assessment */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-light text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Risk Assessment
            </CardTitle>
            <Badge variant="outline" className={getRiskColor(analysis?.risk_assessment?.level)}>
              {analysis?.risk_assessment?.level || 'Unknown'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-white/80 text-sm">{analysis?.risk_assessment?.reasoning}</p>
        </CardContent>
      </Card>

      {/* Spending Patterns */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-light text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Spending Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-white/80 text-sm">{analysis?.spending_patterns?.summary}</p>
          {analysis?.spending_patterns?.insights?.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-white/70 text-sm">{insight}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      {analysis?.anomaly_detection?.anomalies_found && (
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-white/90">
            <p className="font-medium mb-2">Anomalies Detected</p>
            <ul className="space-y-1 text-sm">
              {analysis?.anomaly_detection?.details?.map((detail, idx) => (
                <li key={idx}>• {detail}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Recommendations */}
      {analysis?.security_recommendations?.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-light text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis?.security_recommendations?.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <Badge variant={getPriorityColor(rec.priority)} className="mt-0.5">
                  {rec.priority}
                </Badge>
                <p className="text-white/80 text-sm flex-1">{rec.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggested Trustlines */}
      {analysis?.suggested_trustlines?.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-light text-white">Suggested TrustLines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis?.suggested_trustlines?.map((trustline, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{trustline.currency}</p>
                  <p className="text-white/60 text-xs font-mono">{trustline.issuer}</p>
                  <p className="text-white/70 text-sm mt-1">{trustline.reason}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setupTrustline.mutate({ 
                    currency: trustline.currency, 
                    issuer: trustline.issuer 
                  })}
                  disabled={setupTrustline.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {setupTrustline.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Set Up'
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={handleAnalyze}
          className="border-white/10 text-white hover:bg-white/5"
        >
          <Brain className="w-4 h-4 mr-2" />
          Re-analyze
        </Button>
      </div>
    </div>
  );
}