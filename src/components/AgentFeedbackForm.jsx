import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AgentFeedbackForm({ trainingId, onSuccess }) {
    const [feedback, setFeedback] = useState('');
    const [category, setCategory] = useState('helpfulness');
    const [rating, setRating] = useState(5);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            toast.error('Please enter feedback');
            return;
        }

        setIsLoading(true);
        try {
            const training = await base44.entities.AgentTraining.get(trainingId);
            const feedbackItem = {
                id: Date.now().toString(),
                feedback,
                rating,
                category,
                provided_by: (await base44.auth.me()).full_name,
                timestamp: new Date().toISOString()
            };

            const updatedFeedback = [...(training.feedback_items || []), feedbackItem];
            const avgRating = updatedFeedback.reduce((sum, f) => sum + f.rating, 0) / updatedFeedback.length;

            await base44.entities.AgentTraining.update(trainingId, {
                feedback_items: updatedFeedback,
                average_feedback_rating: avgRating
            });

            toast.success('Feedback submitted');
            setFeedback('');
            setRating(5);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error('Failed to submit feedback');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Provide Training Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="accuracy">Accuracy</SelectItem>
                        <SelectItem value="context">Context Understanding</SelectItem>
                        <SelectItem value="tone">Tone Consistency</SelectItem>
                        <SelectItem value="helpfulness">Helpfulness</SelectItem>
                    </SelectContent>
                </Select>

                <div className="space-y-2">
                    <label className="text-sm text-white/60">Rating (1-5)</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(r => (
                            <button
                                key={r}
                                onClick={() => setRating(r)}
                                className={`p-2 rounded ${rating >= r ? 'text-yellow-400' : 'text-white/30'}`}
                            >
                                <Star className="w-5 h-5 fill-current" />
                            </button>
                        ))}
                    </div>
                </div>

                <Textarea
                    placeholder="Describe the feedback, improvements needed, or patterns observed..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                />

                <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit Feedback
                </Button>
            </CardContent>
        </Card>
    );
}