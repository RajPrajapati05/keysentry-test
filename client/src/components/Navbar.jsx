import { ShieldCheck, GitBranch, LayoutDashboard, Users, Key } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await axios.get(`${BACKEND_URL}/auth/logout`, { withCredentials: true });
    window.location.href = '/login';
  };

  const navLink = (path, label, Icon) => (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition ${
        location.pathname === path
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      <Icon size={16}/>{label}
    </button>
  );

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3 shadow-lg">
      <ShieldCheck className="text-emerald-400" size={28} />
      <span className="text-xl font-bold tracking-tight">KeySentry</span>
      <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">beta</span>

      <div className="flex items-center gap-1 ml-6">
        {navLink('/', 'Dashboard', LayoutDashboard)}
        {navLink('/repos', 'Repositories', GitBranch)}
        {navLink('/team', 'Team', Users)}
        {navLink('/api-keys', 'API Keys', Key)}
      </div>

      {user && (
        <div className="ml-auto flex items-center gap-3">
          {user.avatar && <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full"/>}
          <span className="text-sm text-gray-300">{user.username}</span>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}