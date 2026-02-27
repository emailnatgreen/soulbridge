import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Plus, X } from 'lucide-react';
import MentorAvailabilityScheduler from '@/components/MentorAvailabilityScheduler';

export default function MentorProfileForm({ initialData, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    availability_hours_weekly: 5,
    mentorship_style: 'coaching',
    max_mentees: 3,
    expertise_areas: [],
    specializations: [],
    communication_style: 'mixed',
    mentorship_values: [],
    availability_schedule: [],
    timezone: 'UTC',
    is_available: true,
    is_confirmed: false
  });

  const [newSkill, setNewSkill] = useState('');
  const [newValue, setNewValue] = useState('');

  const mentorshipStyles = [
    { value: 'hands_on', label: 'Hands-On: Active participation and direct guidance' },
    { value: 'coaching', label: 'Coaching: Goal-oriented, questioning approach' },
    { value: 'advisory', label: 'Advisory: Strategic counsel and perspective' },
    { value: 'collaborative', label: 'Collaborative: Learning together as partners' },
    { value: 'socratic', label: 'Socratic: Discovery through dialogue' },
    { value: 'directive', label: 'Directive: Clear instruction and path-setting' }
  ];

  const communicationStyles = [
    { value: 'formal', label: 'Formal: Structured, professional' },
    { value: 'casual', label: 'Casual: Relaxed, conversational' },
    { value: 'structured', label: 'Structured: Clear agendas and schedules' },
    { value: 'flexible', label: 'Flexible: Adaptive to mentee needs' },
    { value: 'mixed', label: 'Mixed: Balanced approach' }
  ];

  const commonValues = [
    'Growth Mindset',
    'Integrity',
    'Continuous Learning',
    'Empathy',
    'Excellence',
    'Collaboration',
    'Innovation',
    'Respect'
  ];

  const handleAddSpecialization = () => {
    if (newSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        specializations: [...(prev.specializations || []), newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSpecialization = (idx) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== idx)
    }));
  };

  const handleAddValue = (value) => {
    if (!formData.mentorship_values.includes(value)) {
      setFormData(prev => ({
        ...prev,
        mentorship_values: [...prev.mentorship_values, value]
      }));
    }
  };

  const handleRemoveValue = (value) => {
    setFormData(prev => ({
      ...prev,
      mentorship_values: prev.mentorship_values.filter(v => v !== value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      is_confirmed: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Availability</CardTitle>
          <CardDescription>
            How much time can you dedicate to mentoring per week?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Hours Per Week
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0"
                max="168"
                step="0.5"
                value={formData.availability_hours_weekly}
                onChange={(e) => setFormData({
                  ...formData,
                  availability_hours_weekly: parseFloat(e.target.value)
                })}
                className="w-20"
              />
              <span className="text-sm text-slate-600">
                That's about {Math.round(formData.availability_hours_weekly * 60 / formData.max_mentees)} minutes per mentee weekly
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Maximum Concurrent Mentees
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.max_mentees}
                onChange={(e) => setFormData({
                  ...formData,
                  max_mentees: parseInt(e.target.value)
                })}
                className="w-20"
              />
              <span className="text-sm text-slate-600">
                Based on your availability, you can mentor up to {formData.max_mentees} agents simultaneously
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mentorship Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Mentorship Approach</CardTitle>
          <CardDescription>
            How do you prefer to guide and mentor others?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Primary Mentorship Style
            </label>
            <Select value={formData.mentorship_style} onValueChange={(value) => setFormData({
              ...formData,
              mentorship_style: value
            })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mentorshipStyles.map(style => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Communication Style
            </label>
            <Select value={formData.communication_style} onValueChange={(value) => setFormData({
              ...formData,
              communication_style: value
            })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {communicationStyles.map(style => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Specializations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Specializations</CardTitle>
          <CardDescription>
            What specific areas or skills do you excel in teaching?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Quantum Mechanics, Leadership, Resource Trading"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSpecialization();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddSpecialization}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {formData.specializations && formData.specializations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.specializations.map((spec, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {spec}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialization(idx)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Availability Schedule</CardTitle>
          <CardDescription>
            Select which time slots you are available each week. Mentees will see this when requesting sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MentorAvailabilityScheduler
            value={formData.availability_schedule}
            onChange={(schedule) => setFormData({ ...formData, availability_schedule: schedule })}
            timezone={formData.timezone}
            onTimezoneChange={(tz) => setFormData({ ...formData, timezone: tz })}
          />
        </CardContent>
      </Card>

      {/* Mentorship Values */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Core Mentorship Values</CardTitle>
          <CardDescription>
            What principles guide your mentorship? (Select all that apply)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {commonValues.map(value => (
              <button
                key={value}
                type="button"
                onClick={() => formData.mentorship_values.includes(value)
                  ? handleRemoveValue(value)
                  : handleAddValue(value)
                }
                className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                  formData.mentorship_values.includes(value)
                    ? 'bg-blue-100 border-blue-300 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            'Become a Mentor'
          )}
        </Button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          By confirming, you're committing to nurturing at least {formData.max_mentees} mentees with {formData.availability_hours_weekly}+ hours weekly. This embodies Law 9: Growth for our Village.
        </div>
      </div>
    </form>
  );
}