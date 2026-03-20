import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";

export default function EditLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link to="/" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Landing
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-tight text-white mb-1">
                Landing Page <span className="font-semibold text-purple-300">Preview</span>
              </h1>
              <p className="text-sm text-purple-300/60">Live view of the current public entrance</p>
            </div>
            <div className="flex gap-3 items-center">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">● Live</Badge>
              <Link to="/" target="_blank">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open Full Page
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Iframe Preview */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-purple-900/40">
          {/* Browser chrome bar */}
          <div className="bg-slate-900 border-b border-white/10 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-xs text-white/40 font-mono">
              soulbridge.app /
            </div>
            <Eye className="w-4 h-4 text-white/30" />
          </div>

          {/* The iframe */}
          <iframe
            src="/"
            className="w-full"
            style={{ height: '80vh', border: 'none', background: '#0f0a1e' }}
            title="Landing Page Preview"
          />
        </div>

        <p className="text-white/25 text-xs text-center mt-4">
          This is a live preview of the public landing page. To edit the content, modify <code className="text-purple-400/60">pages/Landing.jsx</code> directly.
        </p>
      </div>
    </div>
  );
}