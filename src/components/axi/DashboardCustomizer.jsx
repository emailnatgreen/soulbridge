import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const AVAILABLE_WIDGETS = [
  { id: 'alerts', name: 'Alerts Feed', category: 'Critical' },
  { id: 'honor', name: 'Honor Risk Panel', category: 'Governance' },
  { id: 'treasury', name: 'Treasury Status', category: 'Finance' },
  { id: 'automation', name: 'Automation Health', category: 'Systems' },
  { id: 'governance', name: 'Governance Risk', category: 'Governance' },
  { id: 'wellbeing', name: 'Wellbeing Panel', category: 'Village' },
  { id: 'newpagealerts', name: 'New Page Alerts', category: 'Updates' },
  { id: 'system', name: 'System Behavior', category: 'Control' },
  { id: 'personality', name: 'Agent Personality', category: 'Agents' },
  { id: 'metrics', name: 'Metrics Viewer', category: 'Analytics' },
  { id: 'coordination', name: 'Review Coordination', category: 'Reviews' },
  { id: 'pagereviews', name: 'Page Reviews', category: 'Reviews' },
  { id: 'analytics', name: 'Analytics Dashboard', category: 'Analytics' }
];

export default function DashboardCustomizer({ onLayoutChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('axiDashboardLayout');
    return saved ? JSON.parse(saved) : AVAILABLE_WIDGETS.map(w => ({ ...w, visible: true, order: AVAILABLE_WIDGETS.indexOf(w) }));
  });
  const [isDirty, setIsDirty] = useState(false);

  const handleToggleVisibility = (id) => {
    const updated = layout.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setLayout(updated);
    setIsDirty(true);
  };

  const handleSaveLayout = () => {
    localStorage.setItem('axiDashboardLayout', JSON.stringify(layout));
    onLayoutChange(layout);
    setIsDirty(false);
    setIsOpen(false);
  };

  const handleResetLayout = () => {
    const reset = AVAILABLE_WIDGETS.map(w => ({ ...w, visible: true, order: AVAILABLE_WIDGETS.indexOf(w) }));
    setLayout(reset);
    localStorage.removeItem('axiDashboardLayout');
    setIsDirty(true);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
      >
        <Settings className="w-3.5 h-3.5 mr-1.5" />
        Customize
      </Button>

      {isOpen && (
        <div className="absolute top-10 right-0 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Dashboard Widgets</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-xl">×</button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {layout.map(widget => (
              <div key={widget.id} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-white">{widget.name}</p>
                    <p className="text-xs text-slate-400">{widget.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleVisibility(widget.id)}
                  className="text-slate-400 hover:text-white"
                >
                  {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveLayout}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs flex-1"
              disabled={!isDirty}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetLayout}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs flex-1"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}