import { useEffect, useState } from 'react';
import { getScans } from '../api/scans';
import ScanRow from '../components/ScanRow';
import StatCard from '../components/StatCard';
import { ShieldAlert, ShieldCheck, GitCommit, Activity } from 'lucide-react';

export default function Dashboard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getScans()
      .then(res => setScans(res.data))
      .catch(() => setError('Failed to load scans'))
      .finally(() => setLoading(false));
  }, []);

  const total = scans.length;
  const flagged = scans.filter(s => s.status === 'flagged').length;
  const clean = scans.filter(s => s.status === 'clean').length;
  const totalFindings = scans.reduce((sum, s) => sum + (s.findingsCount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Scans" value={total} icon={<GitCommit size={22}/>} color="bg-blue-50 text-blue-500" />
        <StatCard title="Flagged" value={flagged} icon={<ShieldAlert size={22}/>} color="bg-red-50 text-red-500" />
        <StatCard title="Clean" value={clean} icon={<ShieldCheck size={22}/>} color="bg-green-50 text-green-500" />
        <StatCard title="Secrets Found" value={totalFindings} icon={<Activity size={22}/>} color="bg-amber-50 text-amber-500" />
      </div>

      {/* Scans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Scans</h2>
        </div>
        {loading && <p className="p-6 text-gray-400">Loading scans...</p>}
        {error && <p className="p-6 text-red-500">{error}</p>}
        {!loading && !error && scans.length === 0 && (
          <p className="p-6 text-gray-400">No scans yet. Push a commit to your connected repo to trigger a scan.</p>
        )}
        {!loading && scans.length > 0 && (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Repo</th>
                <th className="px-4 py-3 text-left">Commit</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Pushed By</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Findings</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {scans.map(scan => <ScanRow key={scan._id} scan={scan} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}