import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationSettingsPanel({ settings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({
    monthly_budget_credits: settings.monthly_budget_credits || 1000,
    alert_threshold_percent: settings.alert_threshold_percent || 80,
    critical_threshold_percent: settings.critical_threshold_percent || 95,
    preferred_llm_model: settings.preferred_llm_model || 'gpt_5_mini',
    premium_llm_model: settings.premium_llm_model || 'gpt_5_4',
    enable_automation_throttling: settings.enable_automation_throttling || false,
    enable_notifications: settings.enable_notifications || true,
    monthly_reset_day: settings.monthly_reset_day || 1,
    estimated_credit_rate: settings.estimated_credit_rate || 0.01,
    review_notes: settings.review_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.IntegrationCreditSettings.update(settings.id, formData);
      } else {
        await base44.entities.IntegrationCreditSettings.create(formData);
      }
      toast.success('Integration settings saved');
      onSettingsUpdated?.();
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400" /> Integration Credit Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-white/80 mb-2 block">Monthly Budget (Credits)</Label>
            <Input
              type="number"
              value={formData.monthly_budget_credits}
              onChange={(e) => handleChange('monthly_budget_credits', parseInt(e.target.value))}
              className="bg-white/5 border-white/20 text-white"
            />
            <p className="text-xs text-white/40 mt-1">Total credits allocated per month</p>
          </div>

          <div>
            <Label className="text-white/80 mb-2 block">Estimated Cost per Credit (USD)</Label>
            <Input
              type="number"
              step="0.001"
              value={formData.estimated_credit_rate}
              onChange={(e) => handleChange('estimated_credit_rate', parseFloat(e.target.value))}
              className="bg-white/5 border-white/20 text-white"
            />
            <p className="text-xs text-white/40 mt-1">For budget forecasting</p>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div>
            <Label className="text-white/80 mb-2 block">Alert Threshold (%)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.alert_threshold_percent}
              onChange={(e) => handleChange('alert_threshold_percent', parseInt(e.target.value))}
              className="bg-white/5 border-white/20 text-white"
            />
            <p className="text-xs text-white/40 mt-1">Warn at this usage level</p>
          </div>

          <div>
            <Label className="text-white/80 mb-2 block">Critical Threshold (%)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.critical_threshold_percent}
              onChange={(e) => handleChange('critical_threshold_percent', parseInt(e.target.value))}
              className="bg-white/5 border-white/20 text-white"
            />
            <p className="text-xs text-white/40 mt-1">Critical alert at this level</p>
          </div>
        </div>

        {/* LLM Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div>
            <Label className="text-white/80 mb-2 block">Default LLM Model</Label>
            <Select value={formData.preferred_llm_model} onValueChange={(value) => handleChange('preferred_llm_model', value)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20">
                <SelectItem value="gpt_5_mini">GPT-5 Mini (Cost-Effective)</SelectItem>
                <SelectItem value="gemini_3_flash">Gemini 3 Flash (Fast)</SelectItem>
                <SelectItem value="gpt_5">GPT-5 (Balanced)</SelectItem>
                <SelectItem value="gpt_5_4">GPT-5-4 (Advanced)</SelectItem>
                <SelectItem value="claude_sonnet_4_6">Claude Sonnet 4.6 (Premium)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40 mt-1">Used for routine operations</p>
          </div>

          <div>
            <Label className="text-white/80 mb-2 block">Premium LLM Model</Label>
            <Select value={formData.premium_llm_model} onValueChange={(value) => handleChange('premium_llm_model', value)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20">
                <SelectItem value="gpt_5_4">GPT-5-4</SelectItem>
                <SelectItem value="claude_opus_4_6">Claude Opus 4.6</SelectItem>
                <SelectItem value="gemini_3_pro">Gemini 3 Pro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40 mt-1">Reserved for critical tasks</p>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white/80">Enable Automation Throttling</Label>
              <p className="text-xs text-white/40 mt-1">Pause low-priority automations when budget is exceeded</p>
            </div>
            <Switch
              checked={formData.enable_automation_throttling}
              onCheckedChange={(checked) => handleChange('enable_automation_throttling', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white/80">Enable Notifications</Label>
              <p className="text-xs text-white/40 mt-1">Alert when thresholds are reached</p>
            </div>
            <Switch
              checked={formData.enable_notifications}
              onCheckedChange={(checked) => handleChange('enable_notifications', checked)}
            />
          </div>
        </div>

        {/* Monthly Reset Day */}
        <div className="pt-4 border-t border-white/10">
          <Label className="text-white/80 mb-2 block">Monthly Reset Day</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={formData.monthly_reset_day}
            onChange={(e) => handleChange('monthly_reset_day', parseInt(e.target.value))}
            className="bg-white/5 border-white/20 text-white"
          />
          <p className="text-xs text-white/40 mt-1">Day of month when credits reset</p>
        </div>

        {/* Review Notes */}
        <div className="pt-4 border-t border-white/10">
          <Label className="text-white/80 mb-2 block">Admin Review Notes</Label>
          <textarea
            value={formData.review_notes}
            onChange={(e) => handleChange('review_notes', e.target.value)}
            placeholder="Document optimization decisions and adjustments..."
            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/30 text-sm min-h-24"
          />
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}