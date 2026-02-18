// Manages agent-to-agent interactions and their effects

export class InteractionEngine {
    constructor(village) {
        this.village = village;
        this.activeInteractions = [];
        this.interactionHistory = [];
        this.relationshipThresholds = {
            friend: 60,
            bestFriend: 85,
            rival: -50,
            enemy: -80,
            family: 90
        };
    }

    // Determine relationship type based on strength
    getRelationshipType(strength) {
        if (strength >= this.relationshipThresholds.family) return 'family';
        if (strength >= this.relationshipThresholds.bestFriend) return 'best friend';
        if (strength >= this.relationshipThresholds.friend) return 'friend';
        if (strength <= this.relationshipThresholds.enemy) return 'enemy';
        if (strength <= this.relationshipThresholds.rival) return 'rival';
        return 'acquaintance';
    }

    // Random social interaction
    triggerSocialInteraction(agent1, agent2) {
        const interactions = [
            { type: 'chat', moodBoost: 5, bondChange: 3, description: 'had a pleasant chat' },
            { type: 'share_wisdom', moodBoost: 8, bondChange: 5, description: 'shared wisdom' },
            { type: 'joke', moodBoost: 10, bondChange: 4, description: 'shared a laugh' },
            { type: 'help', moodBoost: 12, bondChange: 7, description: 'helped each other' },
            { type: 'conflict', moodBoost: -5, bondChange: -8, description: 'had a disagreement' },
            { type: 'gift', moodBoost: 15, bondChange: 10, description: 'exchanged gifts' }
        ];

        const interaction = interactions[Math.floor(Math.random() * interactions.length)];
        
        // Apply effects
        if (agent1.growth && agent2.growth) {
            // Adjust mood
            const currentMoodValue = this.getMoodValue(agent1.growth.mood);
            agent1.growth.mood = this.adjustMood(currentMoodValue + interaction.moodBoost);
            
            const currentMoodValue2 = this.getMoodValue(agent2.growth.mood);
            agent2.growth.mood = this.adjustMood(currentMoodValue2 + interaction.moodBoost);

            // Strengthen or weaken bond
            if (!agent1.growth.relationships) agent1.growth.relationships = {};
            if (!agent2.growth.relationships) agent2.growth.relationships = {};
            
            agent1.growth.relationships[agent2.id] = (agent1.growth.relationships[agent2.id] || 50) + interaction.bondChange;
            agent2.growth.relationships[agent1.id] = (agent2.growth.relationships[agent1.id] || 50) + interaction.bondChange;

            // Clamp relationship values
            agent1.growth.relationships[agent2.id] = Math.max(-100, Math.min(100, agent1.growth.relationships[agent2.id]));
            agent2.growth.relationships[agent1.id] = Math.max(-100, Math.min(100, agent2.growth.relationships[agent1.id]));
        }

        const result = {
            type: 'social',
            subtype: interaction.type,
            agent1: agent1.name,
            agent2: agent2.name,
            description: `${agent1.name} and ${agent2.name} ${interaction.description}`,
            effect: interaction.moodBoost > 0 ? 'positive' : 'negative',
            timestamp: Date.now()
        };

        this.activeInteractions.push(result);
        this.interactionHistory.push(result);
        
        // Keep only recent history
        if (this.interactionHistory.length > 50) {
            this.interactionHistory = this.interactionHistory.slice(-50);
        }

        return result;
    }

    // Trade resources between agents
    tradeResources(agent1, agent2, resourceType, amount) {
        const interaction = {
            type: 'trade',
            agent1: agent1.name,
            agent2: agent2.name,
            resourceType: resourceType,
            amount: amount,
            description: `${agent1.name} traded ${amount} ${resourceType} with ${agent2.name}`,
            timestamp: Date.now()
        };

        if (agent1.growth && agent2.growth) {
            // Trading builds trust
            agent1.growth.relationships[agent2.id] = (agent1.growth.relationships[agent2.id] || 50) + 5;
            agent2.growth.relationships[agent1.id] = (agent2.growth.relationships[agent1.id] || 50) + 5;

            // Small wisdom gain from trading
            agent1.growth.wisdom += 0.5;
            agent2.growth.wisdom += 0.5;
        }

        this.activeInteractions.push(interaction);
        this.interactionHistory.push(interaction);
        
        return interaction;
    }

    // Cooperative work on task
    cooperativeWork(agents, taskName) {
        const interaction = {
            type: 'cooperative',
            agents: agents.map(a => a.name),
            task: taskName,
            description: `${agents.map(a => a.name).join(', ')} worked together on ${taskName}`,
            timestamp: Date.now()
        };

        agents.forEach(agent => {
            if (agent.growth) {
                // Boost experience for cooperation
                agent.growth.experience += 10;
                
                // Build bonds with all other agents
                agents.forEach(otherAgent => {
                    if (otherAgent.id !== agent.id) {
                        if (!agent.growth.relationships) agent.growth.relationships = {};
                        agent.growth.relationships[otherAgent.id] = (agent.growth.relationships[otherAgent.id] || 50) + 6;
                    }
                });

                // Improve mood from teamwork
                const currentMoodValue = this.getMoodValue(agent.growth.mood);
                agent.growth.mood = this.adjustMood(currentMoodValue + 8);
            }
        });

        this.activeInteractions.push(interaction);
        this.interactionHistory.push(interaction);
        
        return interaction;
    }

    // Form special bonds (family, best friends)
    formBond(agent1, agent2, bondType) {
        if (!agent1.growth || !agent2.growth) return null;

        if (!agent1.growth.relationships) agent1.growth.relationships = {};
        if (!agent2.growth.relationships) agent2.growth.relationships = {};

        const bondStrength = bondType === 'family' ? 95 : 85;
        
        agent1.growth.relationships[agent2.id] = bondStrength;
        agent2.growth.relationships[agent1.id] = bondStrength;

        const interaction = {
            type: 'bond_formed',
            bondType: bondType,
            agent1: agent1.name,
            agent2: agent2.name,
            description: `${agent1.name} and ${agent2.name} formed a ${bondType} bond`,
            timestamp: Date.now()
        };

        this.activeInteractions.push(interaction);
        this.interactionHistory.push(interaction);
        
        return interaction;
    }

    // Simulate natural interactions during village tick
    simulateInteractions(agents) {
        if (agents.length < 2) return [];

        const newInteractions = [];

        // 30% chance of social interaction per tick
        if (Math.random() < 0.3) {
            const agent1 = agents[Math.floor(Math.random() * agents.length)];
            const agent2 = agents[Math.floor(Math.random() * agents.length)];
            
            if (agent1.id !== agent2.id) {
                const result = this.triggerSocialInteraction(agent1, agent2);
                newInteractions.push(result);
            }
        }

        // 10% chance of cooperative work
        if (Math.random() < 0.1 && agents.length >= 2) {
            const teamSize = Math.min(agents.length, Math.floor(Math.random() * 3) + 2);
            const team = [];
            const shuffled = [...agents].sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < teamSize; i++) {
                team.push(shuffled[i]);
            }

            const tasks = ['building', 'farming', 'teaching', 'healing', 'exploring'];
            const task = tasks[Math.floor(Math.random() * tasks.length)];
            
            const result = this.cooperativeWork(team, task);
            newInteractions.push(result);
        }

        // Check for relationship milestones
        agents.forEach(agent => {
            if (agent.growth && agent.growth.relationships) {
                Object.entries(agent.growth.relationships).forEach(([otherId, strength]) => {
                    const other = agents.find(a => a.id === otherId);
                    if (other && strength >= 85 && !agent.growth.bonds?.[otherId]) {
                        // Form best friend bond
                        if (!agent.growth.bonds) agent.growth.bonds = {};
                        agent.growth.bonds[otherId] = 'best friend';
                        
                        newInteractions.push({
                            type: 'milestone',
                            description: `${agent.name} and ${other.name} became best friends!`,
                            timestamp: Date.now()
                        });
                    }
                });
            }
        });

        return newInteractions;
    }

    getMoodValue(mood) {
        const values = {
            troubled: 20,
            calm: 40,
            peaceful: 60,
            joyful: 80,
            festive: 100
        };
        return values[mood] || 50;
    }

    adjustMood(value) {
        value = Math.max(0, Math.min(100, value));
        if (value >= 90) return 'festive';
        if (value >= 70) return 'joyful';
        if (value >= 50) return 'peaceful';
        if (value >= 30) return 'calm';
        return 'troubled';
    }

    getRecentInteractions(count = 10) {
        return this.interactionHistory.slice(-count).reverse();
    }

    clearActiveInteractions() {
        this.activeInteractions = [];
    }

    getAgentRelationships(agent) {
        if (!agent.growth || !agent.growth.relationships) return [];
        
        return Object.entries(agent.growth.relationships).map(([otherId, strength]) => ({
            agentId: otherId,
            strength: strength,
            type: this.getRelationshipType(strength)
        }));
    }
}