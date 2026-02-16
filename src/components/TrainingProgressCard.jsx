import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TrainingProgressCard({ training }) {
    const metrics = training.improvement_metrics || {};
    const chartData = [
        { name: 'Accuracy', value: metrics.accuracy_score || 0 },
        { name: 'Context', value: metrics.context_understanding || 0 },
        { name: 'Helpfulness', value: metrics.helpfulness_score || 0 },
        { name: 'Tone', value: metrics.tone_consistency || 0 }
    ];

    const avgScore = Object.values(metrics).reduce((a, b) => a + (b || 0), 0) / Object.keys(metrics).length;

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
                <CardTitle className="text-white">{training.title}</CardTitle>
                <p className="text-xs text-white/60 mt-1">Sessions: {training.total_sessions || 1} | Avg Rating: {training.average_feedback_rating?.toFixed(1) || 'N/A'}/5</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-white/60">Overall Progress</span>
                        <span className="text-sm font-semibold text-white">{avgScore.toFixed(0)}%</span>
                    </div>
                    <Progress value={avgScore} className="bg-white/10" />
                </div>

                <div className="space-y-3">
                    {chartData.map(item => (
                        <div key={item.name}>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-white/60">{item.name}</span>
                                <span className="text-xs font-semibold text-white">{item.value}%</span>
                            </div>
                            <Progress value={item.value} className="bg-white/10 h-1.5" />
                        </div>
                    ))}
                </div>

                {training.feedback_items && training.feedback_items.length > 0 && (
                    <div className="border-t border-white/10 pt-4">
                        <h4 className="text-sm font-semibold text-white mb-3">Recent Feedback</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {training.feedback_items.slice(-3).map(item => (
                                <div key={item.id} className="bg-white/5 rounded p-2">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-white/60 capitalize">{item.category}</span>
                                        <span className="text-xs text-yellow-400">{'⭐'.repeat(item.rating)}</span>
                                    </div>
                                    <p className="text-xs text-white/70">{item.feedback.substring(0, 60)}...</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}