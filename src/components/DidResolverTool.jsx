import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function DidResolverTool({ trigger }) {
  const [open, setOpen] = useState(false);
  const [didInput, setDidInput] = useState('');
  const [resolvedData, setResolvedData] = useState(null);

  const resolveMutation = useMutation({
    mutationFn: (did) => base44.functions.invoke('resolveDID', { did }),
    onSuccess: (response) => {
      setResolvedData(response.data);
      toast.success('DID resolved successfully');
    },
    onError: (error) => {
      const errorData = error.response?.data;
      setResolvedData({
        error: true,
        ...errorData
      });
      toast.error(errorData?.error || 'Failed to resolve DID');
    }
  });

  const handleResolve = () => {
    if (!didInput.trim()) {
      toast.error('Please enter a DID');
      return;
    }
    setResolvedData(null);
    resolveMutation.mutate(didInput.trim());
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Resolve DID
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            DID Resolver
          </DialogTitle>
          <DialogDescription>
            Resolve any DID to view its document and metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="did-input">DID Address</Label>
            <div className="flex gap-2">
              <Input
                id="did-input"
                placeholder="did:xrpl:rXXXXXXXXXXXXXXXXXXXXXXX..."
                value={didInput}
                onChange={(e) => setDidInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleResolve()}
              />
              <Button 
                onClick={handleResolve}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Enter a DID in the format: did:xrpl:rXXXXXXXXXXXXXXXXXXXXXX
            </p>
          </div>

          {/* Results Section */}
          {resolvedData && (
            <div className="border-t pt-4">
              {resolvedData.error ? (
                // Error Display
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-red-900">Resolution Failed</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {resolvedData.didResolutionMetadata?.message || resolvedData.error}
                      </p>
                      {resolvedData.didResolutionMetadata?.error && (
                        <Badge variant="outline" className="mt-2 text-red-600">
                          {resolvedData.didResolutionMetadata.error}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Success Display
                <div className="space-y-4">
                  {/* Success Header */}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-lg">DID Resolved Successfully</h3>
                  </div>

                  {/* Metadata */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Resolution Metadata</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Retrieved:</span>
                        <div className="font-mono text-xs">
                          {new Date(resolvedData.didResolutionMetadata.retrieved).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Content Type:</span>
                        <div className="font-mono text-xs">
                          {resolvedData.didResolutionMetadata.contentType}
                        </div>
                      </div>
                      {resolvedData.didDocumentMetadata?.network && (
                        <div>
                          <span className="text-gray-600">Network:</span>
                          <Badge variant="outline" className="ml-2">
                            {resolvedData.didDocumentMetadata.network}
                          </Badge>
                        </div>
                      )}
                      {resolvedData.didDocumentMetadata?.version !== undefined && (
                        <div>
                          <span className="text-gray-600">Version:</span>
                          <Badge className="ml-2">
                            v{resolvedData.didDocumentMetadata.version}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DID Document */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-700">DID Document</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(JSON.stringify(resolvedData.didDocument, null, 2))}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                      {JSON.stringify(resolvedData.didDocument, null, 2)}
                    </pre>
                  </div>

                  {/* Additional Metadata */}
                  {resolvedData.didDocumentMetadata?.note && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ℹ️ {resolvedData.didDocumentMetadata.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}