import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function EditLanding() {
  const [imageUrl, setImageUrl] = useState('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699319649276f1077c1f2c81/af72f22d2_file_00000000242c72439de593ccdbbe48bd11.png');
  const [subtitle, setSubtitle] = useState('Experimental AI Agent Research Platform');
  const [buttonText, setButtonText] = useState('Enter the Village');

  const handleSave = () => {
    // This would normally save to a database
    toast.success('Landing page settings saved!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Landing')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Landing
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">
                Edit <span className="font-semibold">Landing Page</span>
              </h1>
              <p className="text-sm text-purple-300/60">Customize your platform entrance</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('Landing')}>
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
              <Button 
                onClick={handleSave}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-light text-white">Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-purple-200/90">Hero Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <p className="text-xs text-purple-300/60">Upload images via Base44 Core.UploadFile integration</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle" className="text-purple-200/90">Subtitle Text</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Enter subtitle"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buttonText" className="text-purple-200/90">CTA Button Text</Label>
                <Input
                  id="buttonText"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Enter the Village"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-light text-white">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg p-8 border border-white/10">
                <div className="space-y-6">
                  <img 
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-auto rounded-lg shadow-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Found';
                    }}
                  />
                  <div className="text-center space-y-3">
                    <Button
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-2"
                    >
                      {buttonText}
                    </Button>
                    <p className="text-purple-300/60 text-xs">{subtitle}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}