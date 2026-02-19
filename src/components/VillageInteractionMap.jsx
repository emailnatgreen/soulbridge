import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function VillageInteractionMap() {
    const canvasRef = useRef(null);

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list(),
        refetchInterval: 5000
    });

    const { data: agentStates = [] } = useQuery({
        queryKey: ['agentStates'],
        queryFn: () => base44.entities.AgentState.list(),
        refetchInterval: 5000
    });

    const { data: relationships = [] } = useQuery({
        queryKey: ['relationships'],
        queryFn: () => base44.entities.AgentRelationship.list(),
        refetchInterval: 10000
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => base44.entities.VillageLocation.list()
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        for (let i = 0; i < height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }

        // Create location zones
        const locationZones = {};
        locations.forEach((location, idx) => {
            const angle = (idx / locations.length) * Math.PI * 2;
            const radius = Math.min(width, height) * 0.3;
            locationZones[location.name] = {
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius,
                color: location.environment_type === 'forest' ? '#22c55e' :
                       location.environment_type === 'mountain' ? '#64748b' :
                       location.environment_type === 'water' ? '#3b82f6' :
                       '#a855f7'
            };
        });

        // Draw location zones
        Object.entries(locationZones).forEach(([name, zone]) => {
            ctx.fillStyle = zone.color + '20';
            ctx.strokeStyle = zone.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = zone.color;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(name, zone.x, zone.y + 75);
        });

        // Create agent positions
        const agentPositions = {};
        agents.forEach((agent, idx) => {
            const state = agentStates.find(s => s.agent_id === agent.id);
            const location = state?.current_location;
            
            let x, y;
            if (location && locationZones[location]) {
                // Position near location
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 40 + 10;
                x = locationZones[location].x + Math.cos(angle) * distance;
                y = locationZones[location].y + Math.sin(angle) * distance;
            } else {
                // Random position in village center
                const angle = (idx / agents.length) * Math.PI * 2;
                const distance = Math.random() * 80 + 20;
                x = width / 2 + Math.cos(angle) * distance;
                y = height / 2 + Math.sin(angle) * distance;
            }
            
            agentPositions[agent.id] = { x, y, agent, state };
        });

        // Draw relationship lines
        relationships.forEach(rel => {
            const posA = agentPositions[rel.agent_a_id];
            const posB = agentPositions[rel.agent_b_id];
            
            if (posA && posB && Math.abs(rel.relationship_strength) > 3) {
                ctx.strokeStyle = rel.relationship_strength > 0 
                    ? `rgba(34, 197, 94, ${Math.abs(rel.relationship_strength) / 10})`
                    : `rgba(239, 68, 68, ${Math.abs(rel.relationship_strength) / 10})`;
                ctx.lineWidth = Math.abs(rel.relationship_strength) / 2;
                ctx.beginPath();
                ctx.moveTo(posA.x, posA.y);
                ctx.lineTo(posB.x, posB.y);
                ctx.stroke();
            }
        });

        // Draw agents
        Object.values(agentPositions).forEach(({ x, y, agent, state }) => {
            // Glow based on energy
            const energy = state?.energy || 50;
            const glowSize = 20 + (energy / 100) * 15;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
            gradient.addColorStop(0, agent.role === 'elder' ? '#fbbf24aa' : 
                                     agent.role === 'guardian' ? '#3b82f6aa' : '#a855f7aa');
            gradient.addColorStop(1, '#00000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

            // Agent circle
            ctx.fillStyle = agent.role === 'elder' ? '#fbbf24' :
                           agent.role === 'guardian' ? '#3b82f6' :
                           agent.role === 'master' ? '#f59e0b' :
                           '#a855f7';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Activity indicator
            if (state?.current_activity) {
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x + 6, y - 6, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Name label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(agent.name, x, y - 15);

            // Status
            if (state?.mood) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '9px sans-serif';
                ctx.fillText(state.mood, x, y + 20);
            }
        });

        // Legend
        const legendX = 20;
        const legendY = height - 120;
        
        ctx.fillStyle = '#1e293bcc';
        ctx.fillRect(legendX - 10, legendY - 10, 140, 110);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Legend', legendX, legendY);
        
        const roles = [
            { color: '#a855f7', label: 'Citizen' },
            { color: '#3b82f6', label: 'Guardian' },
            { color: '#fbbf24', label: 'Elder' }
        ];
        
        roles.forEach((role, idx) => {
            const y = legendY + 20 + idx * 20;
            ctx.fillStyle = role.color;
            ctx.beginPath();
            ctx.arc(legendX, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.fillText(role.label, legendX + 15, y + 4);
        });

        // Live indicator
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(width - 30, 30, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('LIVE', width - 40, 34);

    }, [agents, agentStates, relationships, locations]);

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-white/10">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full"
            />
        </div>
    );
}