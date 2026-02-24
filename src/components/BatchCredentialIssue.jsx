import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function BatchCredentialIssue({ issuerDID, onComplete }) {
  const [recipientList, setRecipientList] = useState('');
  const [credentialTemplate, setCredentialTemplate] = useState({
    credential_type: 'skill_certification',
    credential_name: '',
    description: '',
    visibility: 'private'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const queryClient = useQueryClient();

  const batchIssueMutation = useMutation({
    mutationFn: async ({ recipients, template }) => {
      const results = {
        total: recipients.length,
        successful: [],
        failed: []
      };

      for (const recipient of recipients) {
        try {
          await base44.functions.invoke('issueDidCredential', {
            subject_did: recipient.trim(),
            credential_type: template.credential_type,
            credential_name: template.credential_name,
            credential_data: { description: template.description },
            visibility: template.visibility
          });
          results.successful.push(recipient);
        } catch (error) {
          results.failed.push({ recipient, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ['issued-credentials'] });
      toast.success(`Issued ${data.successful.length} credentials successfully`);
    },
    onError: (error) => {
      toast.error('Batch issuance failed: ' + error.message);
    }
  });

  const handleBatchIssue = async () => {
    const recipients = recipientList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('did:xrpl:'));

    if (recipients.length === 0) {
      toast.error('Please provide at least one valid DID recipient');
      return;
    }

    if (!credentialTemplate.credential_name) {
      toast.error('Please provide a credential name');
      return;
    }

    setIsProcessing(true);
    await batchIssueMutation.mutateAsync({
      recipients,
      template: credentialTemplate
    });
    setIsProcessing(false);
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(1); // Skip header
      const dids = lines
        .map(line => line.split(',')[0].trim())
        .filter(did => did.startsWith('did:xrpl:'))
        .join('\n');
      setRecipientList(dids);
      toast.success(`Loaded ${dids.split('\n').length} DIDs from CSV`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {!results ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Batch Credential Issuance
              </CardTitle>
              <CardDescription>
                Issue the same credential to multiple DIDs at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Setup */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Credential Name</label>
                  <Input
                    placeholder="e.g., Workshop Completion Certificate"
                    value={credentialTemplate.credential_name}
                    onChange={(e) => setCredentialTemplate({
                      ...credentialTemplate,
                      credential_name: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    placeholder="Describe the credential..."
                    value={credentialTemplate.description}
                    onChange={(e) => setCredentialTemplate({
                      ...credentialTemplate,
                      description: e.target.value
                    })}
                    rows={2}
                  />
                </div>
              </div>

              {/* Recipient List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Recipients (one DID per line)</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById('csv-upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        parseCSV(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                <Textarea
                  placeholder="did:xrpl:rAbc123...&#10;did:xrpl:rDef456...&#10;did:xrpl:rGhi789..."
                  value={recipientList}
                  onChange={(e) => setRecipientList(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="text-sm text-gray-600 mt-2">
                  {recipientList.split('\n').filter(l => l.trim().startsWith('did:xrpl:')).length} valid DIDs
                </div>
              </div>

              <Button
                onClick={handleBatchIssue}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Issuing Credentials...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Issue to All Recipients
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Batch Issuance Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{results.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.successful.length}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{results.failed.length}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            {results.failed.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-900">Failed Issuances:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {results.failed.map((fail, idx) => (
                    <div key={idx} className="text-xs bg-red-50 p-2 rounded flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-mono">{fail.recipient.substring(0, 30)}...</div>
                        <div className="text-red-600">{fail.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setResults(null);
                setRecipientList('');
                onComplete?.();
              }}
              className="w-full"
            >
              Issue Another Batch
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}