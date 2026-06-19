import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScanById } from '../api/scans';
import { ArrowLeft, AlertTriangle, CheckCircle, EyeOff, Eye } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suppressing, setSuppressing] = useState(null);

  const fetchScan = () => {
    getScanById(id)
      .then(res => setScan(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchScan(); }, [id]);

  const handleSuppress = async (findingId, permanent = false) => {
    setSuppressing(findingId);
    try {
      const reason = permanent
        ? prompt('Why is this a false positive? (optional)') || ''
        : '';
      await axios.post(
        `${BACKEND_URL}/api/scans/${id}/findings/${findingId}/suppress`,
        { reason, permanent },
        { withCredentials: true }
      );
      fetchScan();
    } catch (err) {
      alert('Failed to suppress finding');
    } finally {
      setSuppressing(null);
    }
  };

  const handleUnsuppress = async (findingId) => {
    setSuppressing(findingId);
    try {
      await axios.post(
        `${BACKEND_URL}/api/scans/${id}/findings/${findingId}/unsuppress`,
        {},
        { withCredentials: true }
      );
      fetchScan();
    } catch (err) {
      alert('Failed to unsuppress finding');
    } finally {
      setSuppressing(null);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!scan) return <div className="p-6 text-red-500">Scan not found.</div>;

  const activeFindings = scan.findings?.filter(f => !f.suppressed) || [];
  const suppressedFindings = scan.findings?.filter(f => f.suppressed) || [];

  const severityConfig = {
    critical: 'bg-red-600 text-white',
    high:     'bg-orange-100 text-orange-700',
    medium:   'bg-yellow-100 text-yellow-700',
    low:      'bg-gray-100 text-gray-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm">
        <ArrowLeft size={16}/> Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {activeFindings.length > 0
            ? <AlertTriangle className="text-red-500" size={24}/>
            : <CheckCircle className="text-green-500" size={24}/>
          }
          <h1 className="text-xl font-bold text-gray-800">{scan.repoFullName}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            activeFindings.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>{activeFindings.length > 0 ? 'flagged' : 'clean'}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-400">Commit</p><p className="font-mono">{scan.commitSha?.slice(0,7)}</p></div>
          <div><p className="text-gray-400">Pushed by</p><p>{scan.pushedBy}</p></div>
          <div><p className="text-gray-400">Scanned at</p><p>{new Date(scan.scannedAt).toLocaleString()}</p></div>
          <div><p className="text-gray-400">Findings</p><p className="font-bold text-red-600">{activeFindings.length}</p></div>
        </div>
        {scan.commitMessage && (
          <p className="mt-4 text-sm text-gray-500 italic">"{scan.commitMessage}"</p>
        )}
      </div>

      {activeFindings.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Secrets Found ({activeFindings.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {activeFindings.map((f) => (
              <div key={f._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">{f.type}</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      severityConfig[f.severity] || severityConfig.low
                    }`}>{f.severity}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSuppress(f._id, false)}
                      disabled={suppressing === f._id}
                      className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      <EyeOff size={12}/> Dismiss
                    </button>
                    <button
                      onClick={() => handleSuppress(f._id, true)}
                      disabled={suppressing === f._id}
                      className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      Mark as false positive
                    </button>
                  </div>
                </div>
                <p className="text-sm font-mono text-gray-600">{f.file} {f.line ? `— line ${f.line}` : ''}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono break-all">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-6">
          <CheckCircle className="text-green-500 mx-auto mb-2" size={32}/>
          <p className="text-green-700 font-semibold">No active secrets in this commit</p>
        </div>
      )}

      {suppressedFindings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-500 text-sm">Dismissed Findings ({suppressedFindings.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {suppressedFindings.map((f) => (
              <div key={f._id} className="px-6 py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-1 rounded">{f.type}</span>
                    <span className="text-xs text-gray-400">dismissed by {f.suppressedBy}</span>
                  </div>
                  <button
                    onClick={() => handleUnsuppress(f._id)}
                    disabled={suppressing === f._id}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Eye size={12}/> Restore
                  </button>
                </div>
                <p className="text-sm font-mono text-gray-500">{f.file} {f.line ? `— line ${f.line}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}