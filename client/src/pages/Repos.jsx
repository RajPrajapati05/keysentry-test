import { useEffect, useState } from 'react';
import { getProviderRepos, connectRepo, disconnectRepo, getConnectionStatus } from '../api/repos';
import { connectGitLab, connectBitbucket } from '../api/connections';
import { GitBranch, Lock, Globe, Plus, Minus, RefreshCw, Link2 } from 'lucide-react';

const PROVIDERS = [
  { id: 'github', label: 'GitHub', color: 'bg-gray-900' },
  { id: 'gitlab', label: 'GitLab', color: 'bg-orange-600' },
  { id: 'bitbucket', label: 'Bitbucket', color: 'bg-blue-600' },
];

export default function Repos() {
  const [activeTab, setActiveTab] = useState('github');
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ github: false, gitlab: false, bitbucket: false });

  const fetchStatus = () => {
    getConnectionStatus()
      .then(res => setConnectionStatus(res.data))
      .catch(() => {});
  };

  const fetchRepos = (provider) => {
    setLoading(true);
    setError(null);
    getProviderRepos(provider)
      .then(res => setRepos(res.data))
      .catch(() => setError(`Failed to load ${provider} repos`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    fetchRepos(activeTab);

    // Check for ?connected=gitlab or ?error=gitlab_failed in URL after OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      setActiveTab(params.get('connected'));
      window.history.replaceState({}, '', '/repos');
    }
  }, [activeTab]);

  const handleConnect = async (repoFullName) => {
    setConnecting(repoFullName);
    try {
      await connectRepo(repoFullName, activeTab);
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
      await disconnectRepo(repoFullName, activeTab);
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

  const isProviderConnected = connectionStatus[activeTab];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Repositories</h1>
        <button onClick={() => fetchRepos(activeTab)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <RefreshCw size={16}/> Refresh
        </button>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-2 mb-6">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              activeTab === p.id
                ? `${p.color} text-white`
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p.label}
            {connectionStatus[p.id] && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>
        ))}
      </div>

      {/* Not connected state */}
      {activeTab !== 'github' && !isProviderConnected && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center mb-6">
          <Link2 className="mx-auto text-gray-300 mb-3" size={32}/>
          <p className="text-gray-600 font-medium mb-1">
            Connect your {PROVIDERS.find(p => p.id === activeTab)?.label} account
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Link your account to scan repos on this platform
          </p>
          <button
            onClick={activeTab === 'gitlab' ? connectGitLab : connectBitbucket}
            className={`px-5 py-2 rounded-lg text-white text-sm font-medium ${
              PROVIDERS.find(p => p.id === activeTab)?.color
            }`}
          >
            Connect {PROVIDERS.find(p => p.id === activeTab)?.label}
          </button>
        </div>
      )}

      {/* Repos list — only show if provider is connected or it's GitHub (primary login) */}
      {(activeTab === 'github' || isProviderConnected) && (
        <>
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
          {loading && <p className="text-gray-400">Loading repositories...</p>}

          {connected.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Connected ({connected.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
                {connected.map(repo => (
                  <RepoRow key={repo.fullName} repo={repo} connecting={connecting}
                    onConnect={handleConnect} onDisconnect={handleDisconnect} />
                ))}
              </div>
            </div>
          )}

          {available.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Available ({available.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
                {available.map(repo => (
                  <RepoRow key={repo.fullName} repo={repo} connecting={connecting}
                    onConnect={handleConnect} onDisconnect={handleDisconnect} />
                ))}
              </div>
            </div>
          )}

          {!loading && filtered.length === 0 && !error && (
            <p className="text-gray-400 text-center py-8">No repositories found.</p>
          )}
        </>
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