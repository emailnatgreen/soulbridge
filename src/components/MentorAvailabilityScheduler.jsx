import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Sun, Sunset, Moon } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = [
  { key: 'morning', label: 'Morning', time: '6am – 12pm', icon: Sun, color: 'yellow' },
  { key: 'afternoon', label: 'Afternoon', time: '12pm – 6pm', icon: Sunset, color: 'orange' },
  { key: 'evening', label: 'Evening', time: '6pm – 10pm', icon: Moon, color: 'indigo' }
];

const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Tokyo', 'Asia/Singapore', 'Asia/Dubai', 'Australia/Sydney'
];

const slotColors = {
  morning: {
    active: 'bg-yellow-100 border-yellow-400 text-yellow-900',
    inactive: 'bg-slate-50 border-slate-200 text-slate-400 hover:border-yellow-300 hover:bg-yellow-50'
  },
  afternoon: {
    active: 'bg-orange-100 border-orange-400 text-orange-900',
    inactive: 'bg-slate-50 border-slate-200 text-slate-400 hover:border-orange-300 hover:bg-orange-50'
  },
  evening: {
    active: 'bg-indigo-100 border-indigo-400 text-indigo-900',
    inactive: 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50'
  }
};

export default function MentorAvailabilityScheduler({ value, onChange, timezone, onTimezoneChange }) {
  // value: array of {day, slots:[]}
  const schedule = value || [];

  const getDaySlots = (day) => {
    const entry = schedule.find(e => e.day === day);
    return entry ? entry.slots : [];
  };

  const toggleSlot = (day, slot) => {
    const currentSlots = getDaySlots(day);
    const newSlots = currentSlots.includes(slot)
      ? currentSlots.filter(s => s !== slot)
      : [...currentSlots, slot];

    const newSchedule = schedule.filter(e => e.day !== day);
    if (newSlots.length > 0) {
      newSchedule.push({ day, slots: newSlots });
    }
    onChange(newSchedule);
  };

  const toggleDay = (day) => {
    const currentSlots = getDaySlots(day);
    if (currentSlots.length === 3) {
      // All selected — deselect all
      onChange(schedule.filter(e => e.day !== day));
    } else {
      // Select all slots
      const newSchedule = schedule.filter(e => e.day !== day);
      newSchedule.push({ day, slots: ['morning', 'afternoon', 'evening'] });
      onChange(newSchedule);
    }
  };

  const totalSlots = schedule.reduce((acc, entry) => acc + entry.slots.length, 0);
  const estimatedHours = totalSlots * 2; // ~2h per slot

  return (
    <div className="space-y-4">
      {/* Timezone */}
      <div className="flex items-center gap-3">
        <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="flex-1">
          <Select value={timezone || 'UTC'} onValueChange={onTimezoneChange}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-slate-500">
          ~{estimatedHours}h/week selected
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {SLOTS.map(slot => {
          const Icon = slot.icon;
          return (
            <div key={slot.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <Icon className="w-3.5 h-3.5" />
              <span className="font-medium">{slot.label}</span>
              <span className="text-slate-400">{slot.time}</span>
            </div>
          );
        })}
      </div>

      {/* Weekly Grid */}
      <div className="space-y-2">
        {DAYS.map(day => {
          const daySlots = getDaySlots(day);
          const allSelected = daySlots.length === 3;
          return (
            <div key={day} className="flex items-center gap-2">
              {/* Day label */}
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`w-24 text-left text-sm font-medium py-1 px-2 rounded transition-colors ${
                  allSelected
                    ? 'text-blue-700 bg-blue-50'
                    : daySlots.length > 0
                    ? 'text-slate-700'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {day.slice(0, 3)}
              </button>

              {/* Slot toggles */}
              <div className="flex gap-2 flex-1">
                {SLOTS.map(slot => {
                  const active = daySlots.includes(slot.key);
                  const Icon = slot.icon;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => toggleSlot(day, slot.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? slotColors[slot.key].active
                          : slotColors[slot.key].inactive
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {schedule.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-2">Your availability summary:</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.filter(day => getDaySlots(day).length > 0).map(day => (
              <Badge key={day} variant="secondary" className="text-xs">
                {day.slice(0, 3)}: {getDaySlots(day).join(', ')}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}