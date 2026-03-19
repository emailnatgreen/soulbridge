import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  X, RotateCcw, Download, Crop, Maximize2, Sliders,
  ZoomIn, ZoomOut, FlipHorizontal, FlipVertical, Check
} from 'lucide-react';
import { toast } from 'sonner';

const FILTERS = [
  { name: 'None', value: '' },
  { name: 'Grayscale', value: 'grayscale(100%)' },
  { name: 'Sepia', value: 'sepia(100%)' },
  { name: 'Warm', value: 'sepia(30%) saturate(140%) hue-rotate(-10deg)' },
  { name: 'Cool', value: 'saturate(80%) hue-rotate(20deg)' },
  { name: 'Vivid', value: 'saturate(200%) contrast(110%)' },
  { name: 'Fade', value: 'opacity(70%) brightness(110%)' },
  { name: 'Noir', value: 'grayscale(100%) contrast(130%)' },
];

export default function ImageEditor({ image, onSave, onClose }) {
  const canvasRef = useRef(null);
  const [imgEl, setImgEl] = useState(null);

  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('');

  // Resize
  const [resizeW, setResizeW] = useState('');
  const [resizeH, setResizeH] = useState('');
  const [keepAspect, setKeepAspect] = useState(true);
  const [originalW, setOriginalW] = useState(1);
  const [originalH, setOriginalH] = useState(1);

  // Flip
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Crop
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const [activeTab, setActiveTab] = useState('filters');
  const [saving, setSaving] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgEl(img);
      setOriginalW(img.naturalWidth);
      setOriginalH(img.naturalHeight);
      setResizeW(String(img.naturalWidth));
      setResizeH(String(img.naturalHeight));
    };
    img.src = image.file_url;
  }, [image]);

  // Draw canvas
  const draw = useCallback(() => {
    if (!canvasRef.current || !imgEl) return;
    const canvas = canvasRef.current;
    const targetW = parseInt(resizeW) || imgEl.naturalWidth;
    const targetH = parseInt(resizeH) || imgEl.naturalHeight;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.save();

    // Apply flips
    ctx.translate(flipH ? targetW : 0, flipV ? targetH : 0);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Build filter string
    let filterStr = selectedFilter
      ? selectedFilter
      : `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
    ctx.filter = filterStr;

    ctx.drawImage(imgEl, 0, 0, targetW, targetH);
    ctx.restore();

    // Crop overlay
    if (cropMode && cropRect) {
      ctx.strokeStyle = 'rgba(139,92,246,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.fillStyle = 'rgba(139,92,246,0.08)';
      ctx.fillRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }
  }, [imgEl, brightness, contrast, saturation, blur, selectedFilter, flipH, flipV, resizeW, resizeH, cropMode, cropRect]);

  useEffect(() => { draw(); }, [draw]);

  // Resize width change (maintain aspect)
  const handleResizeW = (val) => {
    setResizeW(val);
    if (keepAspect && val) {
      const ratio = originalH / originalW;
      setResizeH(String(Math.round(parseInt(val) * ratio)));
    }
  };
  const handleResizeH = (val) => {
    setResizeH(val);
    if (keepAspect && val) {
      const ratio = originalW / originalH;
      setResizeW(String(Math.round(parseInt(val) * ratio)));
    }
  };

  // Crop mouse events on canvas
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e) => {
    if (!cropMode) return;
    const pos = getCanvasPos(e);
    setDragStart(pos);
    setDragging(true);
    setCropRect(null);
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    const pos = getCanvasPos(e);
    setCropRect({
      x: Math.min(pos.x, dragStart.x),
      y: Math.min(pos.y, dragStart.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  };
  const onMouseUp = () => { setDragging(false); };

  const applyCrop = () => {
    if (!cropRect || cropRect.w < 5 || cropRect.h < 5) {
      toast.error('Draw a crop area first');
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    const newCanvas = document.createElement('canvas');
    newCanvas.width = cropRect.w;
    newCanvas.height = cropRect.h;
    newCanvas.getContext('2d').putImageData(imageData, 0, 0);
    // Replace canvas content
    canvas.width = cropRect.w;
    canvas.height = cropRect.h;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    setResizeW(String(Math.round(cropRect.w)));
    setResizeH(String(Math.round(cropRect.h)));
    setCropRect(null);
    setCropMode(false);
    toast.success('Crop applied');
  };

  const reset = () => {
    setBrightness(100); setContrast(100); setSaturation(100); setBlur(0);
    setSelectedFilter(''); setFlipH(false); setFlipV(false);
    if (imgEl) {
      setResizeW(String(imgEl.naturalWidth));
      setResizeH(String(imgEl.naturalHeight));
    }
    setCropRect(null); setCropMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], image.name.replace(/\.[^.]+$/, '') + '_edited.png', { type: 'image/png' });
      await onSave(file, image);
    } catch (e) {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  const tabStyle = (t) =>
    `px-3 py-1.5 text-xs rounded-lg transition-all ${activeTab === t ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="text-white font-medium text-sm truncate max-w-xs">{image.name}</div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="text-white/40 hover:text-white flex items-center gap-1 text-xs">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-black/40 p-4 overflow-auto">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full rounded-lg object-contain"
              style={{
                cursor: cropMode ? 'crosshair' : 'default',
                maxHeight: '60vh',
                filter: selectedFilter
                  ? selectedFilter
                  : `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            />
          </div>

          {/* Controls */}
          <div className="w-72 flex flex-col border-l border-white/10 bg-slate-950 overflow-y-auto">

            {/* Tabs */}
            <div className="flex gap-1 p-3 border-b border-white/10">
              <button className={tabStyle('filters')} onClick={() => setActiveTab('filters')}><Sliders className="w-3 h-3 inline mr-1" />Filters</button>
              <button className={tabStyle('adjust')} onClick={() => setActiveTab('adjust')}><ZoomIn className="w-3 h-3 inline mr-1" />Adjust</button>
              <button className={tabStyle('transform')} onClick={() => setActiveTab('transform')}><Maximize2 className="w-3 h-3 inline mr-1" />Size</button>
            </div>

            <div className="flex-1 p-4 space-y-5">

              {/* Filters Tab */}
              {activeTab === 'filters' && (
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map(f => (
                    <button
                      key={f.name}
                      onClick={() => { setSelectedFilter(f.value); setBrightness(100); setContrast(100); setSaturation(100); setBlur(0); }}
                      className={`rounded-lg p-2 text-xs text-center transition-all border ${selectedFilter === f.value ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Adjust Tab */}
              {activeTab === 'adjust' && (
                <div className="space-y-4">
                  {[
                    { label: 'Brightness', value: brightness, set: setBrightness, min: 0, max: 200 },
                    { label: 'Contrast', value: contrast, set: setContrast, min: 0, max: 200 },
                    { label: 'Saturation', value: saturation, set: setSaturation, min: 0, max: 200 },
                    { label: 'Blur', value: blur, set: setBlur, min: 0, max: 10 },
                  ].map(({ label, value, set, min, max }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>{label}</span><span>{value}{label === 'Blur' ? 'px' : '%'}</span>
                      </div>
                      <Slider min={min} max={max} value={[value]} onValueChange={([v]) => { set(v); setSelectedFilter(''); }} className="w-full" />
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setFlipH(v => !v)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs border transition-all ${flipH ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                    >
                      <FlipHorizontal className="w-3 h-3" /> Flip H
                    </button>
                    <button
                      onClick={() => setFlipV(v => !v)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs border transition-all ${flipV ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                    >
                      <FlipVertical className="w-3 h-3" /> Flip V
                    </button>
                  </div>
                </div>
              )}

              {/* Size / Crop Tab */}
              {activeTab === 'transform' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-white/60 text-xs mb-2">Resize</p>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <p className="text-white/40 text-[10px] mb-1">Width</p>
                        <input
                          type="number"
                          value={resizeW}
                          onChange={e => handleResizeW(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white/40 text-[10px] mb-1">Height</p>
                        <input
                          type="number"
                          value={resizeH}
                          onChange={e => handleResizeH(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={keepAspect} onChange={e => setKeepAspect(e.target.checked)} className="accent-purple-500" />
                      <span className="text-white/50 text-xs">Lock aspect ratio</span>
                    </label>
                    <p className="text-white/30 text-[10px] mt-1">Original: {originalW} × {originalH}px</p>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-white/60 text-xs mb-2">Crop</p>
                    {!cropMode ? (
                      <button
                        onClick={() => { setCropMode(true); setCropRect(null); }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs border border-white/10 text-white/60 hover:border-purple-500 hover:text-purple-300 transition-all"
                      >
                        <Crop className="w-3 h-3" /> Draw crop area on image
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-purple-300 text-xs">Draw on the image to select crop area</p>
                        <div className="flex gap-2">
                          <button onClick={applyCrop} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs bg-purple-600 hover:bg-purple-700 text-white">
                            <Check className="w-3 h-3" /> Apply
                          </button>
                          <button onClick={() => { setCropMode(false); setCropRect(null); }} className="flex-1 py-2 rounded-lg text-xs border border-white/10 text-white/60 hover:border-white/30">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Save */}
            <div className="p-4 border-t border-white/10">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
              >
                {saving ? 'Saving...' : 'Save Edited Image'}
              </Button>
              <p className="text-white/30 text-[10px] text-center mt-1">Saves as new image in your storage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}