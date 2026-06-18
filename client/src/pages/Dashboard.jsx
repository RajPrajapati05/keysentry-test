import { useEffect, useState } from 'react';
import { getScans } from '../api/scans';
import ScanRow from '../components/ScanRow';
import StatCard from '../components/StatCard';
import { ShieldAlert, ShieldCheck, GitCommit, Activity, Filter, X } from 'lucide-react';

export default function Dashboard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    getScans()
      .then(res => setScans(res.data))
      .catch(() => setError('Failed to load scans'))
      .finally(() => setLoading(false));
  }, []);

  // Get unique repos for filter dropdown
  const uniqueRepos = [...new Set(scans.map(s => s.repoFullName))];

  // Apply filters
  const filtered = scans.filter(scan => {
    if (statusFilter !== 'all' && scan.status !== statusFilter) return false;
    if (repoFilter !== 'all' && scan.repoFullName !== repoFilter) return false;
    if (searchFilter && !scan.commitMessage?.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !scan.pushedBy?.toLowerCase().includes(searchFilter.toLowerCase())) return false;

    if (dateFilter !== 'all') {
      const now = new Date();
      const scannedAt = new Date(scan.scannedAt);
      if (dateFilter === 'today') {
        if (scannedAt.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === '7days') {
        const diff = (now - scannedAt) / (1000 * 60 * 60 * 24);
        if (diff > 7) return false;
      } else if (dateFilter === '30days') {
        const diff = (now - scannedAt) / (1000 * 60 * 60 * 24);
        if (diff > 30) return false;
      }
    }
    return true;
  });

  const total = scans.length;
  const flagged = scans.filter(s => s.status === 'flagged').length;
  const clean = scans.filter(s => s.status === 'clean').length;
  const totalFindings = scans.reduce((sum, s) => sum + (s.findingsCount || 0), 0);

  const hasFilters = statusFilter !== 'all' || repoFilter !== 'all' ||
                     dateFilter !== 'all' || searchFilter !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setRepoFilter('all');
    setDateFilter('all');
    setSearchFilter('');
  };

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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400"/>
          <span className="text-sm font-medium text-gray-600">Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <X size={12}/> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search commits, users..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="flagged">Flagged</option>
            <option value="clean">Clean</option>
          </select>

          {/* Repo filter */}
          <select
            value={repoFilter}
            onChange={e => setRepoFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All repos</option>
            {uniqueRepos.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Recent Scans</h2>
          <span className="text-sm text-gray-400">
            {filtered.length} of {total} scans
            {hasFilters && ' (filtered)'}
          </span>
        </div>
        {loading && <p className="p-6 text-gray-400">Loading scans...</p>}
        {error && <p className="p-6 text-red-500">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-gray-400">
              {hasFilters ? 'No scans match your filters.' : 'No scans yet. Push a commit to trigger a scan.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm text-emerald-500 hover:text-emerald-700">
                Clear filters
              </button>
            )}
          </div>
        )}
        {!loading && filtered.length > 0 && (
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
              {filtered.map(scan => <ScanRow key={scan._id} scan={scan} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}