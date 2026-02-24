import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle, XCircle, Shield, History, User, Globe } from 'lucide-react';

const ACTION_LABELS = {
  did_created: { label: 'DID Created', icon: CheckCircle, color: 'text-green-600' },
  did_revoked: { label: 'DID Revoked', icon: XCircle, color: 'text-red-600' },
  did_reversal: { label: 'Revocation Reversed', icon: History, color: 'text-blue-600' },
  permission_granted: { label: 'Permission Granted', icon: Shield, color: 'text-green-600' },
  permission_revoked: { label: 'Permission Revoked', icon: Shield, color: 'text-orange-600' },
  version_created: { label: 'Version Created', icon: FileText, color: 'text-blue-600' },
  version_activated: { label: 'Version Activated', icon: CheckCircle, color: 'text-indigo-600' },
  agent_linked: { label: 'Agent Linked', icon: User, color: 'text-purple-600' },
  agent_unlinked: { label: 'Agent Unlinked', icon: User, color: 'text-gray-600' },
  agent_created: { label: 'Agent Created', icon: User, color: 'text-green-600' },
  agent_updated: { label: 'Agent Updated', icon: User, color: 'text-blue-600' },
  agent_deleted: { label: 'Agent Deleted', icon: User, color: 'text-red-600' },
  did_verified: { label: 'DID Verified', icon: CheckCircle, color: 'text-green-600' },
  did_document_viewed: { label: 'Document Viewed', icon: FileText, color: 'text-gray-600' }
};

export default function AuditLogViewer({ wallet, trigger }) {
  const [open, setOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', wallet?.classic_address],
    queryFn: () => base44.entities.DidAuditLog.filter(
      { did_classic_address: wallet.classic_address },
      '-created_date',
      50
    ),
    enabled: !!wallet && open
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Audit Log
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Activity Audit Log
          </DialogTitle>
          <DialogDescription>
            Complete activity history for {wallet?.name || 'this DID'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const actionConfig = ACTION_LABELS[log.action_type] || {
                  label: log.action_type,
                  icon: FileText,
                  color: 'text-gray-600'
                };
                const Icon = actionConfig.icon;

                return (
                  <div 
                    key={log.id}
                    className={`bg-white border rounded-lg p-4 ${
                      log.success ? 'border-gray-200' : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${actionConfig.color}`} />
                        <span className="font-medium text-sm">{actionConfig.label}</span>
                        {!log.success && (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_date).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* User Info */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-3 h-3" />
                        <span className="text-xs">{log.user_email}</span>
                      </div>

                      {/* IP Address */}
                      {log.ip_address && log.ip_address !== 'unknown' && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Globe className="w-3 h-3" />
                          <span className="text-xs">{log.ip_address}</span>
                        </div>
                      )}

                      {/* Action Details */}
                      {log.action_details && Object.keys(log.action_details).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            View Details
                          </summary>
                          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-x-auto border text-xs">
                            {JSON.stringify(log.action_details, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* Error Message */}
                      {!log.success && log.error_message && (
                        <div className="bg-red-100 border border-red-200 rounded p-2 text-xs text-red-700">
                          <span className="font-medium">Error:</span> {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}