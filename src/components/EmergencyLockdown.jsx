import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle,
  Lock,
  Shield,
  Power,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function EmergencyLockdown({ myDid }) {
  const queryClient = useQueryClient();
  const [lockdownActive, setLockdownActive] = useState(false);

  const activateLockdownMutation = useMutation({
    mutationFn: async () => {
      // 1. Set all privacy settings to maximum
      await base44.functions.invoke('updateDidPrivacy', {
        settings: {
          profile_visibility: 'private',
          message_privacy: 'whitelist_only',
          credential_visibility: 'private',
          endorsement_visibility: 'private',
          reputation_visibility: 'private',
          activity_visibility: 'private',
          connection_list_visibility: 'private',
          allow_indexing: false,
          allow_endorsements: false,
          require_verification_for_messages: true
        }
      });

      // 2. Revoke all temporary access grants
      const permissions = await base44.entities.DidPermission.filter({
        did_classic_address: myDid,
        status: 'active'
      });

      await Promise.all(
        permissions.map(p => 
          base44.entities.DidPermission.update(p.id, { 
            status: 'revoked',
            revoked_at: new Date().toISOString()
          })
        )
      );

      // 3. Log the lockdown event
      await base44.entities.DidAuditLog.create({
        action_type: 'emergency_lockdown',
        did_classic_address: myDid,
        user_id: 'system',
        user_email: 'system',
        action_details: {
          reason: 'Emergency lockdown activated',
          timestamp: new Date().toISOString(),
          revoked_permissions: permissions.length
        },
        success: true
      });

      return { revoked_count: permissions.length };
    },
    onSuccess: (data) => {
      setLockdownActive(true);
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
      queryClient.invalidateQueries({ queryKey: ['temp-access-grants'] });
      queryClient.invalidateQueries({ queryKey: ['privacy-share-links'] });
      toast.success(`Lockdown activated. Revoked ${data.revoked_count} access grants.`);
    },
    onError: (error) => {
      toast.error('Failed to activate lockdown: ' + error.message);
    }
  });

  const deactivateLockdownMutation = useMutation({
    mutationFn: async () => {
      // Log deactivation
      await base44.entities.DidAuditLog.create({
        action_type: 'lockdown_deactivated',
        did_classic_address: myDid,
        user_id: 'system',
        user_email: 'system',
        action_details: {
          reason: 'Emergency lockdown deactivated',
          timestamp: new Date().toISOString()
        },
        success: true
      });
    },
    onSuccess: () => {
      setLockdownActive(false);
      toast.success('Lockdown deactivated. You can now adjust your privacy settings.');
    }
  });

  return (
    <Card className={lockdownActive ? 'bg-red-50 border-red-300' : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Emergency Privacy Lockdown
          </span>
          {lockdownActive && (
            <Badge className="bg-red-600 animate-pulse">
              <Lock className="w-3 h-3 mr-1" />
              ACTIVE
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Instantly maximize privacy and revoke all access in case of security concerns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lockdownActive ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">Lockdown Active</h4>
                  <ul className="space-y-1 text-sm text-red-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      All visibility set to private
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Messages restricted to whitelist only
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      All temporary access grants revoked
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Search indexing disabled
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Verification required for all messages
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={() => deactivateLockdownMutation.mutate()}
              disabled={deactivateLockdownMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {deactivateLockdownMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Deactivate Lockdown
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-red-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">What happens during lockdown?</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>All privacy settings immediately set to maximum security</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>All temporary access grants and share links revoked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Profile becomes completely private and unsearchable</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Only whitelisted DIDs can contact you</span>
                </li>
              </ul>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                  disabled={activateLockdownMutation.isPending}
                >
                  {activateLockdownMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Activate Emergency Lockdown
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    Confirm Emergency Lockdown
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 pt-2">
                    <p className="font-semibold">This action will immediately:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Set all privacy settings to maximum security</li>
                      <li>Revoke all active access grants and share links</li>
                      <li>Restrict messaging to whitelisted DIDs only</li>
                      <li>Hide your profile from search and public view</li>
                    </ul>
                    <p className="text-red-600 font-semibold mt-4">
                      Use this only in case of security concerns or suspicious activity.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => activateLockdownMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Activate Lockdown
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}