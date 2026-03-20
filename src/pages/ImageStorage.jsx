import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload, CloudIcon, HardDrive, Trash2, ExternalLink, Download,
  Image as ImageIcon, Loader2, FolderOpen, Copy, Check, Code2, Link, X, Pencil, CopyPlus, Maximize2
} from 'lucide-react';
import ImageEditor from '@/components/ImageEditor';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

function ImageDimensionsBadge({ src }) {
  const [dims, setDims] = useState(null);
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);
  if (!dims) return null;
  return (
    <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
      <Maximize2 className="w-2.5 h-2.5" />
      {dims.w} × {dims.h}px
    </span>
  );
}

export default function ImageStorage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [driveFileId, setDriveFileId] = useState('');
  const [importing, setImporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [search, setSearch] = useState('');
  const [editingImage, setEditingImage] = useState(null);
  const [resizeImage, setResizeImage] = useState(null);
  const [resizeWidth, setResizeWidth] = useState(800);
  const [resizeHeight, setResizeHeight] = useState(600);
  const [resizing, setResizing] = useState(false);
  const [keepAspect, setKeepAspect] = useState(true);
  const [origDimensions, setOrigDimensions] = useState({ w: 0, h: 0 });

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['image-assets'],
    queryFn: () => base44.entities.ImageAsset.list('-created_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImageAsset.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['image-assets'] }),
  });

  // Upload image to platform
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.ImageAsset.create({
          name: file.name,
          file_url,
          mime_type: file.type,
          size_bytes: file.size,
          source: 'platform_upload',
        });
        toast.success(`Uploaded: ${file.name}`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['image-assets'] });
    setUploading(false);
    e.target.value = '';
  };

  // Sync a platform image to Google Drive
  const handleSyncToDrive = async (image) => {
    setSyncingId(image.id);
    try {
      const res = await base44.functions.invoke('driveUpload', {
        file_url: image.file_url,
        file_name: image.name,
        mime_type: image.mime_type || 'image/jpeg',
      });
      await base44.entities.ImageAsset.update(image.id, {
        google_drive_id: res.data.google_drive_id,
        google_drive_url: res.data.google_drive_url,
      });
      queryClient.invalidateQueries({ queryKey: ['image-assets'] });
      toast.success('Synced to Google Drive!');
    } catch (err) {
      toast.error('Drive sync failed');
    }
    setSyncingId(null);
  };

  // Import image from Google Drive by File ID
  const handleDriveImport = async () => {
    if (!driveFileId.trim()) return;
    setImporting(true);
    try {
      const res = await base44.functions.invoke('driveImport', { file_id: driveFileId.trim() });
      await base44.entities.ImageAsset.create({
        name: res.data.name,
        file_url: res.data.file_url,
        mime_type: res.data.mime_type,
        size_bytes: res.data.size_bytes,
        source: 'google_drive',
        google_drive_id: res.data.google_drive_id,
        google_drive_url: res.data.google_drive_url,
      });
      queryClient.invalidateQueries({ queryKey: ['image-assets'] });
      setDriveFileId('');
      toast.success('Imported from Google Drive!');
    } catch (err) {
      toast.error('Drive import failed — check the File ID');
    }
    setImporting(false);
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditorSave = async (file, originalImage) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ImageAsset.create({
        name: file.name,
        file_url,
        mime_type: file.type,
        size_bytes: file.size,
        source: 'platform_upload',
      });
      queryClient.invalidateQueries({ queryKey: ['image-assets'] });
      setEditingImage(null);
      toast.success('Edited image saved!');
    } catch (err) {
      toast.error('Failed to save edited image');
    }
  };

  const copyFormat = (text, format) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    toast.success('Copied!');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const openResizeDialog = (img) => {
    setResizeImage(img);
    // Load original dimensions
    const el = new window.Image();
    el.onload = () => {
      setOrigDimensions({ w: el.naturalWidth, h: el.naturalHeight });
      setResizeWidth(el.naturalWidth);
      setResizeHeight(el.naturalHeight);
    };
    el.src = img.file_url;
  };

  const handleResizeWidthChange = (val) => {
    const w = parseInt(val) || 1;
    setResizeWidth(w);
    if (keepAspect && origDimensions.w > 0) {
      setResizeHeight(Math.round(w * origDimensions.h / origDimensions.w));
    }
  };

  const handleResizeHeightChange = (val) => {
    const h = parseInt(val) || 1;
    setResizeHeight(h);
    if (keepAspect && origDimensions.h > 0) {
      setResizeWidth(Math.round(h * origDimensions.w / origDimensions.h));
    }
  };

  const handleResizeAndDuplicate = async () => {
    if (!resizeImage) return;
    setResizing(true);
    try {
      // Draw onto canvas at new size
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = resizeImage.file_url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = resizeWidth;
      canvas.height = resizeHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);

      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, resizeImage.mime_type || 'image/jpeg', 0.92));
      const ext = (resizeImage.name.split('.').pop()) || 'jpg';
      const baseName = resizeImage.name.replace(/\.[^.]+$/, '');
      const newName = `${baseName}_${resizeWidth}x${resizeHeight}.${ext}`;
      const file = new File([blob], newName, { type: resizeImage.mime_type || 'image/jpeg' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ImageAsset.create({
        name: newName,
        file_url,
        mime_type: file.type,
        size_bytes: file.size,
        source: 'platform_upload',
        tags: [...(resizeImage.tags || []), `resized_from:${resizeImage.id}`, `${resizeWidth}x${resizeHeight}`],
        description: `Resized copy of "${resizeImage.name}" at ${resizeWidth}×${resizeHeight}px`,
      });
      queryClient.invalidateQueries({ queryKey: ['image-assets'] });
      toast.success(`Saved as "${newName}" (${resizeWidth}×${resizeHeight})`);
      setResizeImage(null);
    } catch (err) {
      toast.error('Resize failed — image may be cross-origin protected');
    }
    setResizing(false);
  };

  const filteredImages = images.filter(img =>
    img.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const sourceColors = {
    platform_upload: 'bg-blue-500/20 text-blue-300',
    google_drive: 'bg-green-500/20 text-green-300',
    one_drive: 'bg-sky-500/20 text-sky-300',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-white">Image Storage</h1>
            <p className="text-white/50 text-sm mt-1">Upload, manage & sync images across platforms</p>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300">{images.length} images</Badge>
        </div>

        {/* Action Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Platform Upload */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2 text-white font-medium">
                <Upload className="w-4 h-4 text-blue-400" />
                Upload to Platform
              </div>
              <p className="text-white/50 text-xs">Upload images directly — stored securely on the platform.</p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Choose Images'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </CardContent>
          </Card>

          {/* Google Drive Import */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2 text-white font-medium">
                <CloudIcon className="w-4 h-4 text-green-400" />
                Import from Google Drive
              </div>
              <p className="text-white/50 text-xs">
                Paste a Google Drive File ID to import it.{' '}
                <span className="text-green-400">Connected: emailnatgreen@gmail.com</span>
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={driveFileId}
                  onChange={(e) => setDriveFileId(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder-white/30 text-xs"
                />
                <Button
                  onClick={handleDriveImport}
                  disabled={importing || !driveFileId.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-white/30 text-xs">
                Find the File ID in the Drive URL: …/file/d/<strong className="text-white/50">FILE_ID</strong>/view
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Microsoft OneDrive — Coming Soon */}
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="pt-4 pb-4 flex items-center gap-4">
            <HardDrive className="w-5 h-5 text-sky-400" />
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Microsoft OneDrive</p>
              <p className="text-white/40 text-xs">OneDrive integration is configured — connect your Microsoft account to enable upload/download.</p>
            </div>
            <Badge className="bg-sky-500/20 text-sky-300 text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        {/* Search */}
        <Input
          placeholder="Search images..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder-white/30"
        />

        {/* Editor URL Panel — shown when an image is selected */}
        {selectedImage && (
          <Card className="bg-white/5 border-purple-500/40 border">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Code2 className="w-4 h-4 text-purple-400" />
                  Editor URLs — <span className="text-purple-300 font-normal truncate max-w-xs">{selectedImage.name}</span>
                </div>
                <button onClick={() => setSelectedImage(null)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Direct URL */}
                {[
                  { label: 'Direct URL', format: 'url', value: selectedImage.file_url, icon: <Link className="w-3 h-3" /> },
                  { label: 'Markdown', format: 'md', value: `![${selectedImage.name}](${selectedImage.file_url})`, icon: <Code2 className="w-3 h-3" /> },
                  { label: 'HTML <img>', format: 'html', value: `<img src="${selectedImage.file_url}" alt="${selectedImage.name}" />`, icon: <Code2 className="w-3 h-3" /> },
                ].map(({ label, format, value, icon }) => (
                  <div key={format} className="space-y-1">
                    <p className="text-white/50 text-xs flex items-center gap-1">{icon} {label}</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-green-300 font-mono truncate">
                        {value}
                      </code>
                      <button
                        onClick={() => copyFormat(value, format)}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-purple-600/70 hover:bg-purple-600 text-white text-xs flex items-center gap-1 transition-colors"
                      >
                        {copiedFormat === format ? <Check className="w-3 h-3 text-green-300" /> : <Copy className="w-3 h-3" />}
                        {copiedFormat === format ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview + Dimensions */}
              <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs">Preview</p>
                <ImageDimensionsBadge src={selectedImage.file_url} />
              </div>
              <img
                src={selectedImage.file_url}
                alt={selectedImage.name}
                className="max-h-40 rounded-lg object-contain bg-black/20 w-full"
              />
              <Button
                onClick={() => openResizeDialog(selectedImage)}
                size="sm"
                className="mt-3 w-full bg-indigo-600/70 hover:bg-indigo-600 text-white gap-2 text-xs"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                Duplicate & Resize this image
              </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Editor Modal */}
        {editingImage && (
          <ImageEditor
            image={editingImage}
            onSave={handleEditorSave}
            onClose={() => setEditingImage(null)}
          />
        )}

        {/* Duplicate & Resize Dialog */}
        <Dialog open={!!resizeImage} onOpenChange={(open) => !open && setResizeImage(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CopyPlus className="w-5 h-5 text-indigo-400" />
                Duplicate & Resize
              </DialogTitle>
            </DialogHeader>
            {resizeImage && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                  <img src={resizeImage.file_url} alt={resizeImage.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{resizeImage.name}</p>
                    <p className="text-white/40 text-xs mt-0.5">Original: {origDimensions.w > 0 ? `${origDimensions.w} × ${origDimensions.h}px` : 'Loading…'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60">
                    <input
                      type="checkbox"
                      checked={keepAspect}
                      onChange={e => setKeepAspect(e.target.checked)}
                      className="rounded"
                    />
                    Lock aspect ratio
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">Width (px)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={resizeWidth}
                      onChange={e => handleResizeWidthChange(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">Height (px)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={resizeHeight}
                      onChange={e => handleResizeHeightChange(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                  <p className="text-indigo-300 text-xs">
                    A <strong>new image</strong> will be saved as:<br />
                    <code className="text-indigo-200 mt-1 block">
                      {resizeImage.name.replace(/\.[^.]+$/, '')}_{ resizeWidth}x{resizeHeight}.{resizeImage.name.split('.').pop()}
                    </code>
                  </p>
                  <p className="text-white/30 text-xs mt-2">The original image is not modified — no duplicates, just a new size variant.</p>
                </div>

                <Button
                  onClick={handleResizeAndDuplicate}
                  disabled={resizing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {resizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CopyPlus className="w-4 h-4" />}
                  {resizing ? 'Creating…' : `Save ${resizeWidth}×${resizeHeight} Copy`}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30 gap-2">
            <ImageIcon className="w-8 h-8" />
            <p>No images yet — upload one above</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((img) => (
              <div key={img.id} className={`group relative rounded-xl overflow-hidden bg-white/5 border transition-all cursor-pointer ${selectedImage?.id === img.id ? 'border-purple-500/70' : 'border-white/10 hover:border-white/30'}`} onClick={() => setSelectedImage(selectedImage?.id === img.id ? null : img)}>
                {/* Thumbnail */}
                <div className="aspect-square overflow-hidden bg-black/20">
                  <img
                    src={img.file_url}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <p className="text-white text-xs font-medium truncate">{img.name}</p>
                  <div className="flex items-center justify-between">
                    <Badge className={`text-[10px] px-1.5 py-0 ${sourceColors[img.source] || 'bg-white/10 text-white/60'}`}>
                      {img.source?.replace('_', ' ')}
                    </Badge>
                    <span className="text-white/40 text-[10px]">{formatBytes(img.size_bytes)}</span>
                  </div>
                </div>

                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingImage(img); }}
                    className="w-7 h-7 rounded-lg bg-purple-600/70 flex items-center justify-center text-white hover:bg-purple-600/90"
                    title="Edit Image"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  {/* Duplicate & Resize */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openResizeDialog(img); }}
                    className="w-7 h-7 rounded-lg bg-indigo-600/70 flex items-center justify-center text-white hover:bg-indigo-600/90"
                    title="Duplicate & Resize"
                  >
                    <CopyPlus className="w-3 h-3" />
                  </button>

                  {/* Copy URL */}
                  <button
                    onClick={() => copyUrl(img.file_url, img.id)}
                    className="w-7 h-7 rounded-lg bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                    title="Copy URL"
                  >
                    {copiedId === img.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>

                  {/* Open */}
                  <a
                    href={img.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                    title="Open"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Sync to Drive */}
                  {!img.google_drive_id && (
                    <button
                      onClick={() => handleSyncToDrive(img)}
                      disabled={syncingId === img.id}
                      className="w-7 h-7 rounded-lg bg-green-600/70 flex items-center justify-center text-white hover:bg-green-600/90"
                      title="Sync to Google Drive"
                    >
                      {syncingId === img.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <CloudIcon className="w-3 h-3" />}
                    </button>
                  )}

                  {/* Drive link if synced */}
                  {img.google_drive_url && (
                    <a
                      href={img.google_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-green-700/70 flex items-center justify-center text-white hover:bg-green-700/90"
                      title="View on Google Drive"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(img.id)}
                    className="w-7 h-7 rounded-lg bg-red-600/70 flex items-center justify-center text-white hover:bg-red-600/90"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Drive badge if synced */}
                {img.google_drive_id && (
                  <div className="absolute bottom-10 left-2">
                    <Badge className="bg-green-600/80 text-white text-[9px] px-1">
                      <CloudIcon className="w-2 h-2 mr-0.5 inline" /> Drive
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}