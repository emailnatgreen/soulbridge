import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  Award,
  Briefcase,
  GraduationCap,
  Users,
  Key,
  Trophy,
  FileCheck
} from 'lucide-react';

export default function CredentialTemplates({ onSelectTemplate }) {
  const templates = [
    {
      type: 'identity_verified',
      name: 'Identity Verification',
      description: 'Confirm identity and KYC status',
      icon: Shield,
      color: 'blue',
      fields: {
        verification_level: 'Level 1-3',
        verified_by: 'Organization',
        verification_date: 'Date'
      }
    },
    {
      type: 'skill_certification',
      name: 'Skill Certification',
      description: 'Certify specific skills and competencies',
      icon: Award,
      color: 'purple',
      fields: {
        skill_name: 'Skill',
        proficiency_level: 'Beginner/Advanced/Expert',
        assessment_score: 'Score'
      }
    },
    {
      type: 'professional_license',
      name: 'Professional License',
      description: 'Official professional licenses and permits',
      icon: Briefcase,
      color: 'green',
      fields: {
        license_number: 'License #',
        issuing_authority: 'Authority',
        valid_until: 'Expiry Date'
      }
    },
    {
      type: 'educational_degree',
      name: 'Educational Degree',
      description: 'Academic degrees and certifications',
      icon: GraduationCap,
      color: 'indigo',
      fields: {
        degree: 'Degree Name',
        institution: 'Institution',
        graduation_date: 'Date',
        gpa: 'GPA (optional)'
      }
    },
    {
      type: 'membership',
      name: 'Membership',
      description: 'Organization or club membership',
      icon: Users,
      color: 'pink',
      fields: {
        organization: 'Organization',
        membership_level: 'Level',
        member_since: 'Date'
      }
    },
    {
      type: 'authorization',
      name: 'Authorization',
      description: 'Grant access rights or permissions',
      icon: Key,
      color: 'yellow',
      fields: {
        access_level: 'Level',
        resource: 'Resource',
        valid_until: 'Expiry'
      }
    },
    {
      type: 'achievement',
      name: 'Achievement',
      description: 'Awards and accomplishments',
      icon: Trophy,
      color: 'orange',
      fields: {
        achievement_name: 'Achievement',
        awarded_by: 'Awarding Body',
        date: 'Date'
      }
    },
    {
      type: 'compliance_attestation',
      name: 'Compliance Attestation',
      description: 'Regulatory and compliance certifications',
      icon: FileCheck,
      color: 'teal',
      fields: {
        regulation: 'Regulation',
        attestation_date: 'Date',
        auditor: 'Auditor'
      }
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300',
      indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-300',
      pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-300',
      yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300',
      teal: 'bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-300'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <Card
            key={template.type}
            className={`cursor-pointer transition-all hover:shadow-lg border-2 ${getColorClasses(template.color)}`}
            onClick={() => onSelectTemplate(template)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-lg mb-3 ${getColorClasses(template.color)}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                <p className="text-xs opacity-75 mb-2">{template.description}</p>
                <Badge variant="outline" className="text-xs">
                  {Object.keys(template.fields).length} fields
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}