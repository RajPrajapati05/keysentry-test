import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ScanDetail from './pages/ScanDetail';
import Login from './pages/Login';
import Repos from './pages/Repos';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/auth/me`, { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  );

  const ProtectedLayout = ({ children }) => user
    ? <><Navbar user={user}/>{children}</>
    : <Navigate to="/login" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/repos" element={<ProtectedLayout><Repos /></ProtectedLayout>} />
        <Route path="/scans/:id" element={<ProtectedLayout><ScanDetail /></ProtectedLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;