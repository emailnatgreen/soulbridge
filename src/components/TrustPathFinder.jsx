import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Search, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TrustPathFinder({ userDID, trustRelationships, wallets }) {
  const [targetDID, setTargetDID] = useState('');
  const [paths, setPaths] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const findTrustPaths = () => {
    if (!targetDID.startsWith('did:xrpl:')) {
      toast.error('Please enter a valid DID');
      return;
    }

    setIsSearching(true);

    // Simple BFS to find all paths
    const queue = [[userDID]];
    const foundPaths = [];
    const visited = new Set();
    const maxDepth = 4; // Limit to 4 degrees of separation

    while (queue.length > 0 && foundPaths.length < 10) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (path.length > maxDepth) continue;
      if (current === targetDID) {
        foundPaths.push(path);
        continue;
      }

      const nextHops = trustRelationships
        .filter(rel => rel.trustor_did === current && !path.includes(rel.trustee_did))
        .map(rel => rel.trustee_did);

      nextHops.forEach(next => {
        const pathKey = [...path, next].join('->');
        if (!visited.has(pathKey)) {
          visited.add(pathKey);
          queue.push([...path, next]);
        }
      });
    }

    // Calculate trust scores for each path
    const pathsWithScores = foundPaths.map(path => {
      let totalTrust = 100;
      const hops = [];

      for (let i = 0; i < path.length - 1; i++) {
        const rel = trustRelationships.find(
          r => r.trustor_did === path[i] && r.trustee_did === path[i + 1]
        );
        if (rel) {
          totalTrust *= (rel.trust_level / 100);
          hops.push({
            from: path[i],
            to: path[i + 1],
            trust: rel.trust_level,
            type: rel.trust_type
          });
        }
      }

      return {
        path,
        hops,
        pathTrust: Math.round(totalTrust),
        length: path.length - 1
      };
    });

    pathsWithScores.sort((a, b) => b.pathTrust - a.pathTrust);

    setPaths(pathsWithScores);
    setIsSearching(false);

    if (pathsWithScores.length === 0) {
      toast.error('No trust path found to this DID');
    } else {
      toast.success(`Found ${pathsWithScores.length} trust path(s)`);
    }
  };

  const getTrustColor = (trust) => {
    if (trust >= 80) return 'bg-green-100 text-green-800';
    if (trust >= 60) return 'bg-blue-100 text-blue-800';
    if (trust >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Trust Path Finder
        </CardTitle>
        <CardDescription>
          Discover how you're connected to any DID through trust relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter target DID (did:xrpl:...)"
            value={targetDID}
            onChange={(e) => setTargetDID(e.target.value)}
            className="font-mono"
          />
          <Button 
            onClick={findTrustPaths}
            disabled={isSearching}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSearching ? 'Searching...' : 'Find Path'}
          </Button>
        </div>

        {/* Results */}
        {paths && (
          <div className="space-y-4">
            {paths.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No trust path found</p>
                <p className="text-sm mt-1">This DID is not in your trust network</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Found {paths.length} Path{paths.length > 1 ? 's' : ''}
                  </h3>
                  <Badge className="bg-green-600">
                    Best: {paths[0].pathTrust}% trust
                  </Badge>
                </div>

                <div className="space-y-3">
                  {paths.map((pathData, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Path #{idx + 1}</Badge>
                          <Badge className={getTrustColor(pathData.pathTrust)}>
                            {pathData.pathTrust}% Combined Trust
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {pathData.length} {pathData.length === 1 ? 'hop' : 'hops'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {pathData.hops.map((hop, hopIdx) => (
                          <div key={hopIdx} className="flex items-center gap-2 text-sm">
                            <div className="font-mono text-gray-700 flex-1 truncate">
                              {hop.from === userDID ? 'You' : hop.from.substring(0, 25) + '...'}
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <Badge variant="outline" className="text-xs">
                              {hop.trust}%
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {hop.type}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <div className="font-mono text-gray-700 flex-1 truncate text-right">
                              {hop.to === targetDID ? 'Target' : hop.to.substring(0, 25) + '...'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Info */}
        {!paths && (
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-2">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Enter any DID to find trust paths connecting you</li>
              <li>Paths show how trust flows through intermediaries</li>
              <li>Combined trust decreases with each hop in the chain</li>
              <li>Shorter paths with higher trust are ranked first</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}