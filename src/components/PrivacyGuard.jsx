import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Privacy Guard - Checks and enforces privacy settings
 * Shows appropriate messaging when access is denied
 */
export default function PrivacyGuard({ 
  targetDid, 
  viewerDid, 
  accessType,
  children,
  fallback = null,
  showReason = true
}) {
  const { data: privacyCheck, isLoading } = useQuery({
    queryKey: ['privacy-check', targetDid, viewerDid, accessType],
    queryFn: async () => {
      const response = await base44.functions.invoke('checkDidPrivacy', {
        target_did: targetDid,
        viewer_did: viewerDid,
        access_type: accessType
      });
      return response.data;
    },
    enabled: !!targetDid && !!accessType
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!privacyCheck?.allowed) {
    if (fallback) return fallback;

    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">
                {accessType === 'messages' ? 'Cannot Send Message' : 'Access Restricted'}
              </h3>
              {showReason && privacyCheck?.reason && (
                <p className="text-sm text-amber-700">{privacyCheck.reason}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-600 font-medium">
                  Privacy Level: {privacyCheck?.level}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}