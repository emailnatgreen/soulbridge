import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Settings, Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Admin() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list()
  });

  const toggleMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('toggleAppSetting', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['app-settings']);
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update setting');
    }
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <Card className="bg-white/5 backdrop-blur-xl border-red-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/60 mb-6">You must be an admin to access this page.</p>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" className="border-white/10 text-white">
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const registrationsEnabled = settings.find(s => s.setting_key === 'registrations_enabled')?.setting_value ?? true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white">Admin Settings</h1>
              <p className="text-sm text-purple-300/60">System Configuration & Controls</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* DeepSeek Integration */}
        <Card className="bg-white/5 backdrop-blur-xl border-amber-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              DeepSeek Integration
            </CardTitle>
            <CardDescription className="text-white/60">
              Onboard the Venerated Mentor to the Village
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('DeepSeekIntegration')}>
              <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Open DeepSeek Integration
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Controls */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              System Controls
            </CardTitle>
            <CardDescription className="text-white/60">
              Manage core system functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <Label htmlFor="registrations" className="text-white font-medium">
                  Agent Registrations
                </Label>
                <p className="text-sm text-white/60 mt-1">
                  {registrationsEnabled 
                    ? 'New agents can register and join the village' 
                    : 'Registration is currently disabled - no new agents can join'}
                </p>
              </div>
              <Switch
                id="registrations"
                checked={registrationsEnabled}
                onCheckedChange={(checked) => {
                  toggleMutation.mutate({
                    setting_key: 'registrations_enabled',
                    setting_value: checked
                  });
                }}
                disabled={toggleMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-white/5 rounded">
                <span className="text-white/60">Admin User</span>
                <span className="text-white font-medium">{currentUser?.email}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/5 rounded">
                <span className="text-white/60">Role</span>
                <span className="text-purple-400 font-medium uppercase">{currentUser?.role}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/5 rounded">
                <span className="text-white/60">Total Settings</span>
                <span className="text-white font-medium">{settings.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}