import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Shield, 
  Lock, 
  CheckCircle,
  FileText,
  Database,
  Settings
} from 'lucide-react';
import DidAuthGuard from '../components/DidAuthGuard';

function ProtectedContent() {
  const session = JSON.parse(localStorage.getItem('did_auth_session') || '{}');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('Home')}>
          <Button variant="outline" className="mb-6">
            ← Back to Home
          </Button>
        </Link>

        {/* Success Banner */}
        <Card className="mb-6 border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Access Granted!</h3>
                <p className="text-sm text-green-700">
                  You are authenticated with DID: <span className="font-mono">{session.did?.substring(0, 30)}...</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Lock className="w-10 h-10 text-emerald-600" />
            Protected Resource Demo
          </h1>
          <p className="text-gray-600">
            This page requires DID authentication to access
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Sensitive Documents
              </CardTitle>
              <CardDescription>
                Access confidential files and records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confidential Report Q1</span>
                    <Badge>Protected</Badge>
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Financial Data 2024</span>
                    <Badge>Protected</Badge>
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Strategic Plans</span>
                    <Badge>Protected</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                Private Data Access
              </CardTitle>
              <CardDescription>
                View and manage sensitive information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm">Personal Records</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm">Transaction History</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm">Identity Credentials</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600" />
                Admin Controls
              </CardTitle>
              <CardDescription>
                Administrative settings and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  User Management
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  System Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Access Control
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Security Features
              </CardTitle>
              <CardDescription>
                DID-based security and verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>End-to-end encrypted access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Cryptographic signature verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Decentralized identity management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>No central authority required</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-indigo-900 mb-2">
              How DID Authentication Works:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-indigo-800">
              <li>User selects or enters their DID address</li>
              <li>System generates a unique authentication challenge</li>
              <li>User signs the challenge with their DID's private key</li>
              <li>System verifies the cryptographic signature</li>
              <li>Upon successful verification, a secure session is established</li>
            </ol>
            <div className="mt-4 p-3 bg-white rounded border border-indigo-200">
              <p className="text-xs text-indigo-700">
                <strong>Your Session:</strong> Authenticated at {new Date(session.authenticated_at).toLocaleString()}
                {' · '}Session Token: <span className="font-mono">{session.session_token}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DidProtectedDemo() {
  return (
    <DidAuthGuard requireDID={true}>
      <ProtectedContent />
    </DidAuthGuard>
  );
}