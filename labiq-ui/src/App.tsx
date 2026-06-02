import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LabDetailPage } from './pages/LabDetailPage';
import { LabsPage } from './pages/LabsPage';

function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/labs" replace />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/labs/:id" element={<LabDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
