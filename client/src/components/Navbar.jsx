import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3 shadow-lg">
      <ShieldCheck className="text-emerald-400" size={28} />
      <span className="text-xl font-bold tracking-tight">KeySentry</span>
      <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">beta</span>
    </nav>
  );
}