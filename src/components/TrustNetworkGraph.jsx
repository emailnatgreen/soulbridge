import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function TrustNetworkGraph({ userDID, trustRelationships, wallets }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || !userDID) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 500;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get relevant DIDs
    const connectedDIDs = new Set();
    connectedDIDs.add(userDID);
    
    trustRelationships.forEach(rel => {
      if (rel.trustor_did === userDID || rel.trustee_did === userDID) {
        connectedDIDs.add(rel.trustor_did);
        connectedDIDs.add(rel.trustee_did);
      }
    });

    const nodes = Array.from(connectedDIDs).map((did, idx) => ({
      did,
      x: width / 2 + Math.cos(idx * 2 * Math.PI / connectedDIDs.size) * 150 * zoom,
      y: height / 2 + Math.sin(idx * 2 * Math.PI / connectedDIDs.size) * 150 * zoom,
      isUser: did === userDID
    }));

    // Draw connections
    trustRelationships.forEach(rel => {
      const fromNode = nodes.find(n => n.did === rel.trustor_did);
      const toNode = nodes.find(n => n.did === rel.trustee_did);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        
        // Color by trust level
        const trustLevel = rel.trust_level;
        if (trustLevel >= 80) ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
        else if (trustLevel >= 60) ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        else if (trustLevel >= 40) ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
        else ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        
        ctx.lineWidth = Math.max(1, trustLevel / 20);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(
          toNode.x - arrowSize * Math.cos(angle - Math.PI / 6),
          toNode.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(toNode.x, toNode.y);
        ctx.lineTo(
          toNode.x - arrowSize * Math.cos(angle + Math.PI / 6),
          toNode.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.isUser ? 20 : 12, 0, 2 * Math.PI);
      ctx.fillStyle = node.isUser ? '#4f46e5' : '#8b5cf6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1f2937';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        node.did.substring(9, 16) + '...',
        node.x,
        node.y + (node.isUser ? 35 : 28)
      );
    });

  }, [userDID, trustRelationships, wallets, zoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trust Network Visualization</CardTitle>
            <CardDescription>
              Interactive graph showing your trust connections
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
          <canvas ref={canvasRef} className="w-full" style={{ height: '500px' }} />
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>High Trust (80+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Moderate (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>Low (40-59)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Minimal (&lt;40)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}