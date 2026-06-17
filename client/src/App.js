import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ScanDetail from './pages/ScanDetail';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scans/:id" element={<ScanDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;