import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { History, CheckCircle2, Clock, Plus, FileJson } from 'lucide-react';
import { toast } from 'sonner';

export default function DidVersioningDialog({ wallet, didDocument, trigger }) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [changesSummary, setChangesSummary] = useState('');
  const [documentJson, setDocumentJson] = useState('');
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['did-versions', wallet?.classic_address],
    queryFn: () => base44.entities.DidDocumentVersion.filter({ 
      did_classic_address: wallet.classic_address 
    }, '-version_number'),
    enabled: !!wallet && open
  });

  const createVersionMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createDidDocumentVersion', data),
    onSuccess: () => {
      toast.success('New version created successfully');
      queryClient.invalidateQueries(['did-versions']);
      setIsCreating(false);
      setChangesSummary('');
      setDocumentJson('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create version');
    }
  });

  const setActiveMutation = useMutation({
    mutationFn: (versionId) => base44.functions.invoke('setActiveDidDocumentVersion', { 
      version_id: versionId 
    }),
    onSuccess: () => {
      toast.success('Active version updated');
      queryClient.invalidateQueries(['did-versions']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to set active version');
    }
  });

  const handleCreateVersion = () => {
    let parsedDocument;
    try {
      parsedDocument = JSON.parse(documentJson);
    } catch (e) {
      toast.error('Invalid JSON document');
      return;
    }

    createVersionMutation.mutate({
      wallet_id: wallet.id,
      document: parsedDocument,
      changes_summary: changesSummary || 'New version',
      set_as_active: true
    });
  };

  const handleSetActive = (versionId) => {
    if (confirm('Set this version as active? This will deactivate the current version.')) {
      setActiveMutation.mutate(versionId);
    }
  };

  const activeVersion = versions.find(v => v.is_active);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Version History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            DID Document Versions
          </DialogTitle>
          <DialogDescription>
            Manage versions of the DID document for {wallet?.name || 'this DID'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Version Section */}
          {!isCreating ? (
            <div className="border-b pb-4">
              <Button onClick={() => {
                setIsCreating(true);
                setDocumentJson(JSON.stringify(didDocument, null, 2));
              }} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create New Version
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Version
              </h3>
              
              <div>
                <Label>Changes Summary</Label>
                <Textarea
                  placeholder="Describe what changed in this version..."
                  value={changesSummary}
                  onChange={(e) => setChangesSummary(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label>DID Document (JSON)</Label>
                <Textarea
                  placeholder="Enter DID document JSON..."
                  value={documentJson}
                  onChange={(e) => setDocumentJson(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateVersion}
                  disabled={createVersionMutation.isPending || !documentJson}
                  className="flex-1"
                >
                  {createVersionMutation.isPending ? 'Creating...' : 'Create & Set as Active'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreating(false);
                    setChangesSummary('');
                    setDocumentJson('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Version History */}
          <div>
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Version History ({versions.length})
            </h3>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <FileJson className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p>No versions created yet</p>
                <p className="text-xs mt-1">Create your first version to start tracking changes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div 
                    key={version.id}
                    className={`bg-white border rounded-lg p-4 transition-all ${
                      version.is_active 
                        ? 'border-green-500 shadow-md' 
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={version.is_active ? "default" : "outline"} className="text-xs">
                          v{version.version_number}
                        </Badge>
                        {version.is_active && (
                          <Badge className="bg-green-600 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      {!version.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(version.id)}
                          disabled={setActiveMutation.isPending}
                        >
                          Set as Active
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {version.changes_summary && (
                        <div>
                          <span className="text-xs font-medium text-gray-600">Changes:</span>
                          <p className="text-sm text-gray-700 mt-1">{version.changes_summary}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(version.created_date).toLocaleString()}
                        </span>
                      </div>

                      <details className="mt-3">
                        <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800">
                          View Document
                        </summary>
                        <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-x-auto border">
                          {JSON.stringify(version.document, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}