import { ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function Navbar({ user }) {
  const handleLogout = async () => {
    await axios.get('/auth/logout');
    window.location.href = '/login';
  };

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3 shadow-lg">
      <ShieldCheck className="text-emerald-400" size={28} />
      <span className="text-xl font-bold tracking-tight">KeySentry</span>
      <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">beta</span>
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