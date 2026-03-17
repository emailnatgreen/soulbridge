import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, FileJson, Edit3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function ServiceEditor({ services, onChange }) {
  const add = () => onChange([...services, { id: '', type: '', serviceEndpoint: '', description: '' }]);
  const remove = (i) => onChange(services.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {services.map((svc, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50 relative">
          <button onClick={() => remove(i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Service ID (fragment)</Label>
              <Input placeholder="#profile" value={svc.id} onChange={e => update(i, 'id', e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Input placeholder="SoulBridgeProfile" value={svc.type} onChange={e => update(i, 'type', e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Service Endpoint (URL)</Label>
            <Input placeholder="https://..." value={svc.serviceEndpoint} onChange={e => update(i, 'serviceEndpoint', e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input placeholder="What this service provides" value={svc.description || ''} onChange={e => update(i, 'description', e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="w-full">
        <Plus className="w-3 h-3 mr-2" /> Add Service
      </Button>
    </div>
  );
}

function AlsoKnownAsEditor({ values, onChange }) {
  const add = () => onChange([...values, '']);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i, val) => {
    const updated = [...values];
    updated[i] = val;
    onChange(updated);
  };
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} onChange={e => update(i, e.target.value)} placeholder="Alias or alternate URI" className="h-8 text-sm" />
          <Button size="sm" variant="ghost" onClick={() => remove(i)} className="px-2 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="w-full">
        <Plus className="w-3 h-3 mr-2" /> Add Alias
      </Button>
    </div>
  );
}

export default function DidDocumentEditor({ wallet, didDocument, trigger }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('services');

  const [services, setServices] = useState([]);
  const [alsoKnownAs, setAlsoKnownAs] = useState([]);

  const initState = () => {
    setServices((didDocument?.service || []).map(s => ({ ...s })));
    setAlsoKnownAs(
      Array.isArray(didDocument?.alsoKnownAs)
        ? [...didDocument.alsoKnownAs]
        : didDocument?.alsoKnownAs ? [didDocument.alsoKnownAs] : []
    );
  };

  const handleOpen = (isOpen) => {
    if (isOpen) initState();
    setOpen(isOpen);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updatedDoc = {
        ...didDocument,
        alsoKnownAs,
        service: services.map(s => ({
          id: s.id.startsWith('did:') ? s.id : `${didDocument.id}${s.id.startsWith('#') ? '' : '#'}${s.id}`,
          type: s.type,
          serviceEndpoint: s.serviceEndpoint,
          ...(s.description ? { description: s.description } : {}),
        })),
        updated: new Date().toISOString(),
      };

      // Save as a new DID document version
      return await base44.functions.invoke('createDidDocumentVersion', {
        wallet_id: wallet.id,
        document: updatedDoc,
        changes_summary: `Updated services (${services.length}) and aliases (${alsoKnownAs.length})`,
        set_as_active: true,
      });
    },
    onSuccess: () => {
      toast.success('DID Document updated and new version saved');
      queryClient.invalidateQueries(['dh-versions']);
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save DID Document');
    }
  });

  return (
    <>
      <span onClick={() => handleOpen(true)} className="cursor-pointer">
        {trigger || (
          <Button size="sm" variant="outline">
            <Edit3 className="w-3 h-3 mr-2" /> Edit DID Doc
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-600" />
              Edit DID Document
            </DialogTitle>
            <DialogDescription>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">did:xrpl:{wallet.classic_address}</code>
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="services">
                Services <Badge className="ml-2 h-5 text-xs">{services.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="aliases">
                Also Known As <Badge className="ml-2 h-5 text-xs">{alsoKnownAs.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="mt-4 space-y-2">
              <p className="text-xs text-gray-500">
                Services link your DID to external endpoints — portfolios, governance preferences, API endpoints, and more.
              </p>
              <ServiceEditor services={services} onChange={setServices} />
            </TabsContent>

            <TabsContent value="aliases" className="mt-4 space-y-2">
              <p className="text-xs text-gray-500">
                Aliases let your DID be known by additional names or URIs across different systems.
              </p>
              <AlsoKnownAsEditor values={alsoKnownAs} onChange={setAlsoKnownAs} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saveMutation.isPending ? 'Saving…' : 'Save & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}