import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";

export default function VillageInteractionMap() {
    const canvasRef = useRef(null);
    const [hoveredAgent, setHoveredAgent] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const animationRef = useRef(null);

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
        
        let animationFrame = 0;
        let agentPositions = {};
        
        const animate = () => {
            animationFrame++;
            draw(animationFrame);
            animationRef.current = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            setMousePos({ x, y });
            
            // Check if hovering over an agent
            let found = null;
            Object.values(agentPositions).forEach(({ x: ax, y: ay, agent }) => {
                const dist = Math.sqrt((x - ax) ** 2 + (y - ay) ** 2);
                if (dist < 15) found = agent;
            });
            setHoveredAgent(found);
        };

        canvas.addEventListener('mousemove', handleMouseMove);

        const draw = (frame) => {

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
        agentPositions = {};
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

        // Draw relationship lines with trust indicators
        relationships.forEach(rel => {
            const posA = agentPositions[rel.agent_a_id];
            const posB = agentPositions[rel.agent_b_id];
            
            if (posA && posB && Math.abs(rel.relationship_strength) > 3) {
                const isStrong = Math.abs(rel.relationship_strength) > 7;
                const alpha = Math.min(0.8, Math.abs(rel.relationship_strength) / 10);
                
                ctx.strokeStyle = rel.relationship_strength > 0 
                    ? `rgba(34, 197, 94, ${alpha})`
                    : `rgba(239, 68, 68, ${alpha})`;
                ctx.lineWidth = isStrong ? 3 : 1.5;
                
                // Dashed line for weak relationships
                if (!isStrong) ctx.setLineDash([5, 5]);
                
                ctx.beginPath();
                ctx.moveTo(posA.x, posA.y);
                ctx.lineTo(posB.x, posB.y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw trust indicator at midpoint
                if (rel.trust_level) {
                    const midX = (posA.x + posB.x) / 2;
                    const midY = (posA.y + posB.y) / 2;
                    ctx.fillStyle = rel.trust_level > 7 ? '#22c55e' : rel.trust_level < 4 ? '#ef4444' : '#fbbf24';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`T${rel.trust_level}`, midX, midY);
                }
            }
        });

        // Draw agents with enhanced details
        Object.values(agentPositions).forEach(({ x, y, agent, state }) => {
            const energy = state?.energy || 50;
            const wisdom = state?.wisdom || 0;
            const isHovered = hoveredAgent?.id === agent.id;
            
            // Animated glow based on energy (pulsing effect)
            const pulseScale = 1 + Math.sin(frame * 0.05) * 0.1;
            const glowSize = (20 + (energy / 100) * 15) * (isHovered ? 1.3 : 1) * pulseScale;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
            gradient.addColorStop(0, agent.role === 'elder' ? '#fbbf24aa' : 
                                     agent.role === 'guardian' ? '#3b82f6aa' : 
                                     agent.role === 'master' ? '#f59e0baa' : '#a855f7aa');
            gradient.addColorStop(1, '#00000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

            // Energy ring
            ctx.strokeStyle = energy > 70 ? '#22c55e' : energy > 40 ? '#fbbf24' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, (energy / 100) * Math.PI * 2);
            ctx.stroke();

            // Agent circle
            ctx.fillStyle = agent.role === 'elder' ? '#fbbf24' :
                           agent.role === 'guardian' ? '#3b82f6' :
                           agent.role === 'master' ? '#f59e0b' :
                           agent.role === 'teacher' ? '#8b5cf6' :
                           agent.role === 'trader' ? '#10b981' :
                           '#a855f7';
            ctx.beginPath();
            ctx.arc(x, y, isHovered ? 10 : 8, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = isHovered ? '#fbbf24' : '#ffffff';
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.stroke();

            // Honor indicator (small crown for high honor)
            if (agent.honor_score > 80) {
                ctx.fillStyle = '#fbbf24';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('👑', x, y - 22);
            }

            // Activity indicator with animation
            if (state?.current_activity) {
                const activityPulse = Math.sin(frame * 0.1) * 2;
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x + 8, y - 8, 3 + activityPulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Name label with shadow
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ffffff';
            ctx.font = isHovered ? 'bold 12px sans-serif' : 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(agent.name, x, y - 18);
            ctx.shadowBlur = 0;

            // Role badge
            ctx.fillStyle = '#1e293b';
            const roleText = agent.role.substring(0, 3).toUpperCase();
            ctx.font = '8px sans-serif';
            const roleWidth = ctx.measureText(roleText).width + 6;
            ctx.fillRect(x - roleWidth / 2, y + 16, roleWidth, 12);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(roleText, x, y + 24);

            // Wisdom indicator for high wisdom agents
            if (wisdom > 50) {
                ctx.fillStyle = '#8b5cf6';
                ctx.font = '10px sans-serif';
                ctx.fillText(`✨${wisdom}`, x, y + 36);
            }

            // Current activity label
            if (state?.current_activity && isHovered) {
                ctx.fillStyle = '#1e293bee';
                const actText = state.current_activity.substring(0, 20);
                const actWidth = ctx.measureText(actText).width + 8;
                ctx.fillRect(x - actWidth / 2, y + 42, actWidth, 14);
                ctx.fillStyle = '#10b981';
                ctx.font = '9px sans-serif';
                ctx.fillText(actText, x, y + 52);
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

        // Stats panel
        const statsX = width - 160;
        const statsY = 20;
        
        ctx.fillStyle = '#1e293bdd';
        ctx.fillRect(statsX, statsY, 140, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Village Stats', statsX + 10, statsY + 18);
        
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Agents: ${agents.length}`, statsX + 10, statsY + 35);
        ctx.fillText(`Locations: ${locations.length}`, statsX + 10, statsY + 50);
        ctx.fillText(`Bonds: ${relationships.length}`, statsX + 10, statsY + 65);

        // Live indicator with pulse
        const livePulse = Math.sin(frame * 0.15) * 2;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(statsX + 125, statsY + 12, 4 + livePulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#10b981';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('LIVE', statsX + 115, statsY + 16);
        };

        animate();
        
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [agents, agentStates, relationships, locations, hoveredAgent]);

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-white/10">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full cursor-crosshair"
            />
            
            {/* Hover tooltip */}
            {hoveredAgent && (
                <div 
                    className="absolute bg-slate-900/95 border border-white/20 rounded-lg p-3 pointer-events-none backdrop-blur-sm"
                    style={{
                        left: `${(mousePos.x / 800) * 100}%`,
                        top: `${(mousePos.y / 600) * 100}%`,
                        transform: 'translate(-50%, -120%)'
                    }}
                >
                    <div className="text-white font-semibold mb-1">{hoveredAgent.name}</div>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <Badge className="text-xs capitalize">{hoveredAgent.role}</Badge>
                            <span className="text-amber-300">Honor: {hoveredAgent.honor_score}</span>
                        </div>
                        {agentStates.find(s => s.agent_id === hoveredAgent.id) && (
                            <>
                                <div className="text-white/70">
                                    Energy: {agentStates.find(s => s.agent_id === hoveredAgent.id)?.energy || 0}%
                                </div>
                                <div className="text-white/70">
                                    Wisdom: {agentStates.find(s => s.agent_id === hoveredAgent.id)?.wisdom || 0}
                                </div>
                                {agentStates.find(s => s.agent_id === hoveredAgent.id)?.current_activity && (
                                    <div className="text-green-300">
                                        📍 {agentStates.find(s => s.agent_id === hoveredAgent.id)?.current_activity}
                                    </div>
                                )}
                                {agentStates.find(s => s.agent_id === hoveredAgent.id)?.current_location && (
                                    <div className="text-cyan-300">
                                        📌 {agentStates.find(s => s.agent_id === hoveredAgent.id)?.current_location}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}