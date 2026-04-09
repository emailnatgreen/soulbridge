import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Copy, Image, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function ImageStorage() {
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['image-assets'],
    queryFn: () => base44.entities.ImageAsset.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImageAsset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-assets'] });
      toast.success('Image deleted');
    },
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.ImageAsset.create({
          name: file.name,
          url: file_url,
          file_size: file.size,
          mime_type: file.type,
        });
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['image-assets'] });
    setUploading(false);
    toast.success('Upload complete');
    e.target.value = '';
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = images.filter(img =>
    !search || img.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link to="/home">
            <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-3 px-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Image className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Image Storage</h1>
                <p className="text-purple-200/60 text-sm">Upload and manage Village images</p>
              </div>
            </div>
            <label className="cursor-pointer">
              <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? 'Uploading…' : 'Upload Images'}
                </span>
              </Button>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Search + Count */}
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search images by name…"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30 max-w-sm"
          />
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            {filtered.length} image{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
            <Image className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">{search ? 'No images match your search.' : 'No images uploaded yet. Click Upload Images to get started.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(img => (
              <div key={img.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-purple-500/40 transition">
                <div className="aspect-square bg-slate-900 relative overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={() => copyUrl(img.url, img.id)}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                      title="Copy URL"
                    >
                      {copiedId === img.id ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(img.id)}
                      className="w-8 h-8 rounded-full bg-red-500/30 hover:bg-red-500/50 flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-300" />
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-white text-xs truncate font-medium">{img.name || 'Untitled'}</p>
                  {img.file_size && (
                    <p className="text-white/30 text-[10px]">{(img.file_size / 1024).toFixed(1)} KB</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}