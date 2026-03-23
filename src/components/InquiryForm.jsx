import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Send, Loader2 } from 'lucide-react';

export default function InquiryForm({ source = 'website' }) {
    const [form, setForm] = useState({ sender_email: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await base44.functions.invoke('submitInquiry', { ...form, source });
        if (res.data?.success) {
            setSubmitted(true);
        } else {
            setError('Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <h3 className="text-xl font-semibold text-white">Inquiry Sent</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                    Thank you! We've received your message and will get back to you shortly.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="sender_email" className="text-slate-300">Your Email</Label>
                <Input
                    id="sender_email"
                    name="sender_email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.sender_email}
                    onChange={handleChange}
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="subject" className="text-slate-300">Subject</Label>
                <Input
                    id="subject"
                    name="subject"
                    placeholder="What is your inquiry about?"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="message" className="text-slate-300">Message</Label>
                <Textarea
                    id="message"
                    name="message"
                    placeholder="Describe your question or issue..."
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 resize-none"
                />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {loading ? 'Sending...' : 'Send Inquiry'}
            </Button>
        </form>
    );
}