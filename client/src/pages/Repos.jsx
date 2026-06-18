import { useEffect, useState } from 'react';
import { getGithubRepos, connectRepo, disconnectRepo } from '../api/repos';
import { GitBranch, Lock, Globe, Plus, Minus, RefreshCw } from 'lucide-react';

export default function Repos() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchRepos = () => {
    setLoading(true);
    getGithubRepos()
      .then(res => setRepos(res.data))
      .catch(() => setError('Failed to load repos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRepos(); }, []);

  const handleConnect = async (repoFullName) => {
    setConnecting(repoFullName);
    try {
      await connectRepo(repoFullName);
      setRepos(prev => prev.map(r =>
        r.fullName === repoFullName ? { ...r, isConnected: true } : r
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to connect repo');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (repoFullName) => {
    setConnecting(repoFullName);
    try {
      await disconnectRepo(repoFullName);
      setRepos(prev => prev.map(r =>
        r.fullName === repoFullName ? { ...r, isConnected: false } : r
      ));
    } finally {
      setConnecting(null);
    }
  };

  const filtered = repos.filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const connected = filtered.filter(r => r.isConnected);
  const available = filtered.filter(r => !r.isConnected);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Repositories</h1>
        <button onClick={fetchRepos} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <RefreshCw size={16}/> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-gray-400">Loading your repositories...</p>}

      {/* Connected repos */}
      {connected.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Connected ({connected.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
            {connected.map(repo => (
              <RepoRow
                key={repo.fullName}
                repo={repo}
                connecting={connecting}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available repos */}
      {available.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Available ({available.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
            {available.map(repo => (
              <RepoRow
                key={repo.fullName}
                repo={repo}
                connecting={connecting}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RepoRow({ repo, connecting, onConnect, onDisconnect }) {
  const isLoading = connecting === repo.fullName;

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
      <GitBranch size={18} className="text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-sm">{repo.fullName}</span>
          {repo.private
            ? <Lock size={12} className="text-gray-400"/>
            : <Globe size={12} className="text-gray-400"/>
          }
          {repo.language && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {repo.language}
            </span>
          )}
        </div>
        {repo.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{repo.description}</p>
        )}
      </div>
      {repo.isConnected ? (
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
            Connected
          </span>
          <button
            onClick={() => onDisconnect(repo.fullName)}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            <Minus size={14}/> Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => onConnect(repo.fullName)}
          disabled={isLoading}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition"
        >
          <Plus size={14}/>
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      )}
    </div>
  );
}