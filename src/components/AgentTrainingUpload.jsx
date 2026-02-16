import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AgentTrainingUpload({ agentId, agentName, onSuccess }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleUpload = async () => {
        if (!title || !file) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            // Upload the file
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            
            // Extract conversation data from file
            const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url: uploadRes.file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        conversations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    timestamp: {"type": "string"},
                                    speaker: {"type": "string"},
                                    message: {"type": "string"},
                                    context: {"type": "string"}
                                }
                            }
                        }
                    }
                }
            });

            if (extractRes.status !== 'success') {
                throw new Error('Failed to extract training data from file');
            }

            // Create training record
            await base44.entities.AgentTraining.create({
                agent_id: agentId,
                training_type: 'conversation_log',
                title,
                description,
                training_data: extractRes.output,
                status: 'in_progress',
                improvement_metrics: {
                    accuracy_score: 0,
                    context_understanding: 0,
                    helpfulness_score: 0,
                    tone_consistency: 0
                }
            });

            toast.success(`Training logs uploaded for ${agentName}`);
            setTitle('');
            setDescription('');
            setFile(null);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.message || 'Failed to upload training logs');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Upload Conversation Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input
                    placeholder="Training session title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                />
                <Textarea
                    placeholder="Description of what this training covers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
                <div className="space-y-2">
                    <label className="text-sm text-white/60">Upload CSV or JSON file</label>
                    <input
                        type="file"
                        accept=".csv,.json"
                        onChange={(e) => setFile(e.target.files?.[0])}
                        className="w-full text-white/60"
                    />
                </div>
                <Button
                    onClick={handleUpload}
                    disabled={isLoading || !file}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isLoading ? 'Uploading...' : 'Upload Training Data'}
                </Button>
            </CardContent>
        </Card>
    );
}