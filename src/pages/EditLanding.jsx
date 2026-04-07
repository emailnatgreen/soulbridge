import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, ExternalLink, Monitor, Smartphone, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";

export default function EditLanding() {
  const [viewMode, setViewMode] = useState('desktop');
  const iframeRef = useRef(null);
  const [iframeKey, setIframeKey] = useState(0);

  const previewUrl = window.location.origin + '/?_preview=1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Landing
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white mb-1">
                Landing Page <span className="font-semibold text-purple-300">Preview</span>
              </h1>
              <p className="text-sm text-purple-300/60">Live view of the current public entrance</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">● Live</Badge>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                    viewMode === 'desktop' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                    viewMode === 'mobile' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIframeKey(k => k + 1)}
                className="border-white/20 text-white hover:bg-white/10 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload
              </Button>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Full Page
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div
          className={`mx-auto rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-purple-900/40 transition-all duration-300 ${
            viewMode === 'mobile' ? 'max-w-[390px]' : 'w-full'
          }`}
        >
          <div className="bg-slate-900 border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-xs text-white/40 font-mono truncate">
              soulbridge.app /
            </div>
            <Eye className="w-3.5 h-3.5 text-white/30" />
          </div>

          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={previewUrl}
            className="w-full bg-slate-950"
            style={{ height: viewMode === 'mobile' ? '75vh' : '80vh', border: 'none' }}
            title="Landing Page Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>

        <p className="text-white/25 text-xs text-center mt-4">
          This is a live preview of the public landing page. To edit content, modify <code className="text-purple-400/60">pages/LandingPage.jsx</code> directly.
        </p>
      </div>
    </div>
  );
}