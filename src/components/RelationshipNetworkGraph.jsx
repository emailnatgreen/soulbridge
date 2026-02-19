import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RelationshipNetworkGraph({ relationships, agents }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !relationships || !agents) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Build node positions
        const agentMap = new Map(agents.map(a => [a.id, a]));
        const nodes = agents.map((agent, i) => {
            const angle = (i / agents.length) * Math.PI * 2;
            const radius = Math.min(width, height) / 4;
            return {
                id: agent.id,
                name: agent.name,
                x: width / 4 + Math.cos(angle) * radius,
                y: height / 4 + Math.sin(angle) * radius,
                connections: 0
            };
        });

        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        // Draw edges
        relationships.forEach(rel => {
            const nodeA = nodeMap.get(rel.agent_a_id);
            const nodeB = nodeMap.get(rel.agent_b_id);
            
            if (!nodeA || !nodeB) return;

            nodeA.connections++;
            nodeB.connections++;

            const strength = rel.relationship_strength || 0;
            
            // Color based on relationship
            let color;
            let width;
            if (strength >= 7) {
                color = 'rgba(34, 197, 94, 0.6)'; // green
                width = 3;
            } else if (strength >= 4) {
                color = 'rgba(59, 130, 246, 0.5)'; // blue
                width = 2;
            } else if (strength >= 0) {
                color = 'rgba(148, 163, 184, 0.3)'; // gray
                width = 1;
            } else if (strength >= -3) {
                color = 'rgba(251, 146, 60, 0.5)'; // orange
                width = 2;
            } else {
                color = 'rgba(239, 68, 68, 0.6)'; // red
                width = 3;
            }

            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        });

        // Draw nodes
        nodes.forEach(node => {
            // Node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8 + (node.connections * 2), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, node.x, node.y + 25);
        });

    }, [relationships, agents]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                className="w-full h-96 bg-black/20 rounded-lg"
            />
            <div className="mt-4 flex gap-4 justify-center text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-green-500" />
                    <span className="text-white/60">Strong Bond</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-blue-500" />
                    <span className="text-white/60">Friend</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-gray-500" />
                    <span className="text-white/60">Neutral</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-red-500" />
                    <span className="text-white/60">Tension</span>
                </div>
            </div>
        </div>
    );
}