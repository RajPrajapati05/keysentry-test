import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScanById } from '../api/scans';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScanById(id)
      .then(res => setScan(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!scan) return <div className="p-6 text-red-500">Scan not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm">
        <ArrowLeft size={16}/> Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {scan.status === 'flagged'
            ? <AlertTriangle className="text-red-500" size={24}/>
            : <CheckCircle className="text-green-500" size={24}/>
          }
          <h1 className="text-xl font-bold text-gray-800">{scan.repoFullName}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            scan.status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>{scan.status}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-400">Commit</p><p className="font-mono">{scan.commitSha?.slice(0,7)}</p></div>
          <div><p className="text-gray-400">Pushed by</p><p>{scan.pushedBy}</p></div>
          <div><p className="text-gray-400">Scanned at</p><p>{new Date(scan.scannedAt).toLocaleString()}</p></div>
          <div><p className="text-gray-400">Findings</p><p className="font-bold text-red-600">{scan.findingsCount}</p></div>
        </div>
        {scan.commitMessage && (
          <p className="mt-4 text-sm text-gray-500 italic">"{scan.commitMessage}"</p>
        )}
      </div>

      {scan.findings?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Secrets Found ({scan.findings.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {scan.findings.map((f, i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">{f.type}</span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    f.severity === 'critical' ? 'bg-red-600 text-white' :
                    f.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{f.severity}</span>
                </div>
                <p className="text-sm font-mono text-gray-600">{f.file} {f.line ? `— line ${f.line}` : ''}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono break-all">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="text-green-500 mx-auto mb-2" size={32}/>
          <p className="text-green-700 font-semibold">No secrets found in this commit</p>
        </div>
      )}
    </div>
  );
}