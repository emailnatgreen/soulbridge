import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Download,
  FileText,
  Database,
  Shield,
  Calendar,
  CheckCircle,
  Loader2,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function DataExportCompliance({ myDid }) {
  const [exportOptions, setExportOptions] = useState({
    profile: true,
    audit_logs: true,
    messages: true,
    credentials: true,
    endorsements: true,
    trust_relationships: true,
    privacy_settings: true,
    permissions: true
  });

  const { data: exportStats } = useQuery({
    queryKey: ['export-stats', myDid],
    queryFn: async () => {
      const [
        auditLogs,
        messages,
        credentials,
        endorsements,
        trusts,
        permissions
      ] = await Promise.all([
        base44.entities.DidAuditLog.filter({ did_classic_address: myDid }),
        base44.entities.DidMessage.filter({ to_did: `did:xrpl:${myDid}` }),
        base44.entities.DidCredential.filter({ subject_did: `did:xrpl:${myDid}` }),
        base44.entities.DidEndorsement.filter({ endorsed_did: `did:xrpl:${myDid}` }),
        base44.entities.TrustRelationship.filter({ trustor_did: `did:xrpl:${myDid}` }),
        base44.entities.DidPermission.filter({ did_classic_address: myDid })
      ]);

      return {
        audit_logs: auditLogs.length,
        messages: messages.length,
        credentials: credentials.length,
        endorsements: endorsements.length,
        trust_relationships: trusts.length,
        permissions: permissions.length
      };
    },
    enabled: !!myDid
  });

  const exportDataMutation = useMutation({
    mutationFn: async (options) => {
      const exportData = {
        export_metadata: {
          did_address: myDid,
          export_date: new Date().toISOString(),
          format: 'json',
          included_data: Object.entries(options)
            .filter(([_, included]) => included)
            .map(([key]) => key)
        },
        data: {}
      };

      // Fetch selected data
      if (options.profile) {
        const wallets = await base44.entities.Wallet.filter({ 
          classic_address: myDid 
        });
        exportData.data.profile = wallets[0] || null;
      }

      if (options.audit_logs) {
        exportData.data.audit_logs = await base44.entities.DidAuditLog.filter({ 
          did_classic_address: myDid 
        });
      }

      if (options.messages) {
        const [sent, received] = await Promise.all([
          base44.entities.DidMessage.filter({ from_did: `did:xrpl:${myDid}` }),
          base44.entities.DidMessage.filter({ to_did: `did:xrpl:${myDid}` })
        ]);
        exportData.data.messages = { sent, received };
      }

      if (options.credentials) {
        exportData.data.credentials = await base44.entities.DidCredential.filter({ 
          subject_did: `did:xrpl:${myDid}` 
        });
      }

      if (options.endorsements) {
        const [given, received] = await Promise.all([
          base44.entities.DidEndorsement.filter({ endorser_did: `did:xrpl:${myDid}` }),
          base44.entities.DidEndorsement.filter({ endorsed_did: `did:xrpl:${myDid}` })
        ]);
        exportData.data.endorsements = { given, received };
      }

      if (options.trust_relationships) {
        const [given, received] = await Promise.all([
          base44.entities.TrustRelationship.filter({ trustor_did: `did:xrpl:${myDid}` }),
          base44.entities.TrustRelationship.filter({ trustee_did: `did:xrpl:${myDid}` })
        ]);
        exportData.data.trust_relationships = { given, received };
      }

      if (options.privacy_settings) {
        const settings = await base44.entities.DidPrivacySetting.filter({ 
          did_address: myDid 
        });
        exportData.data.privacy_settings = settings[0] || null;
      }

      if (options.permissions) {
        exportData.data.permissions = await base44.entities.DidPermission.filter({ 
          did_classic_address: myDid 
        });
      }

      return exportData;
    },
    onSuccess: (data) => {
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `did-export-${myDid}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    },
    onError: (error) => {
      toast.error('Export failed: ' + error.message);
    }
  });

  const handleExport = () => {
    const selectedOptions = Object.entries(exportOptions)
      .filter(([_, selected]) => selected)
      .map(([key]) => key);

    if (selectedOptions.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    exportDataMutation.mutate(exportOptions);
  };

  const totalRecords = exportStats ? 
    Object.values(exportStats).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Data Export & Compliance
          </CardTitle>
          <CardDescription>
            Export your data for compliance, backup, or portability (GDPR, CCPA compliant)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{totalRecords}</div>
              <div className="text-xs text-gray-600">Total Records</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <Shield className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-gray-900">GDPR</div>
              <div className="text-xs text-gray-600">Compliant</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-gray-900">JSON</div>
              <div className="text-xs text-gray-600">Format</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Select Data to Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="profile"
                  checked={exportOptions.profile}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, profile: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="profile" className="font-medium">Profile Information</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    DID address, wallet info, network details
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="audit_logs"
                  checked={exportOptions.audit_logs}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, audit_logs: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="audit_logs" className="font-medium">Audit Logs</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {exportStats?.audit_logs || 0} access logs and activity records
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="messages"
                  checked={exportOptions.messages}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, messages: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="messages" className="font-medium">Messages</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {exportStats?.messages || 0} sent and received messages
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="credentials"
                  checked={exportOptions.credentials}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, credentials: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="credentials" className="font-medium">Credentials</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {exportStats?.credentials || 0} verifiable credentials
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="endorsements"
                  checked={exportOptions.endorsements}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, endorsements: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="endorsements" className="font-medium">Endorsements</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {exportStats?.endorsements || 0} endorsements given/received
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="trust_relationships"
                  checked={exportOptions.trust_relationships}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, trust_relationships: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="trust_relationships" className="font-medium">Trust Network</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {exportStats?.trust_relationships || 0} trust relationships
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="privacy_settings"
                  checked={exportOptions.privacy_settings}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, privacy_settings: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="privacy_settings" className="font-medium">Privacy Settings</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Current privacy configuration and preferences
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="permissions"
                  checked={exportOptions.permissions}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, permissions: checked })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="permissions" className="font-medium">Access Permissions</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {exportStats?.permissions || 0} granted permissions and access tokens
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exportDataMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
              size="lg"
            >
              {exportDataMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Exporting Data...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export Selected Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Info */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="w-5 h-5" />
            Data Rights & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-green-900">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5" />
              <span><strong>Right to Access:</strong> Export all your personal data at any time</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5" />
              <span><strong>Right to Portability:</strong> Machine-readable JSON format for easy transfer</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5" />
              <span><strong>Data Transparency:</strong> Complete audit trail of all access and modifications</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5" />
              <span><strong>GDPR & CCPA Compliant:</strong> Meets international data protection standards</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}