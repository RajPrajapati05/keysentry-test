import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null); // shown once after generation
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const res = await api.get('/api/keys');
      setKeys(res.data);
    } catch (err) {
      setError('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!keyName.trim()) return;
    try {
      setCreating(true);
      setError('');
      setNewKey(null);
      const res = await api.post('/api/keys', { name: keyName.trim() });
      setNewKey(res.data.key);
      setKeyName('');
      await loadKeys();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create key.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id, name) {
    if (!window.confirm(`Revoke key "${name}"? This cannot be undone.`)) return;
    try {
      setError('');
      await api.delete(`/api/keys/${id}`);
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      setError('Failed to revoke key.');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">API Keys</h1>
      <p className="text-gray-400 text-sm mb-6">
        Use API keys to access the KeySentry REST API. Keys are shown only once when created.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* New key banner — shown once after generation */}
      {newKey && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/40 rounded-xl">
          <p className="text-green-300 text-sm font-medium mb-2">
            ✅ API key created — copy it now. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-3">
            <code className="flex-1 text-sm text-green-300 break-all">{newKey}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Create key form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Create New API Key</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            placeholder="Key name (e.g. CI pipeline, monitoring)"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {creating ? 'Creating...' : 'Generate Key'}
          </button>
        </form>
      </div>

      {/* Keys list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold">Your API Keys</h2>
          <span className="text-xs text-gray-500">{keys.length} key(s)</span>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            No API keys yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {keys.map(key => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <code className="text-gray-400">{key.prefix}...</code>
                    {' · '}Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && (
                      <> · Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id, key.name)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors ml-4"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage docs */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-3">API Usage</h2>
        <p className="text-gray-400 text-sm mb-3">Base URL: <code className="text-blue-300">https://keysentry-test.onrender.com</code></p>
        <div className="space-y-3 text-sm">
          {[
            ['GET', '/v1/scans', 'List recent scans'],
            ['GET', '/v1/scans/:id', 'Get scan details + findings'],
            ['GET', '/v1/repos', 'List connected repos'],
            ['GET', '/v1/findings', 'List all active findings'],
          ].map(([method, path, desc]) => (
            <div key={path} className="flex items-start gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-xs font-bold text-blue-400 mt-0.5 w-10 shrink-0">{method}</span>
              <code className="text-gray-300 text-xs flex-1">{path}</code>
              <span className="text-gray-500 text-xs">{desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Authentication header:</p>
          <code className="text-xs text-green-300">Authorization: Bearer ks_your_api_key_here</code>
        </div>
      </div>
    </div>
  );
}