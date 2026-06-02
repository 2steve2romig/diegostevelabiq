import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { LabDetailPage } from './pages/LabDetailPage';
import { LabOfferingsPage } from './pages/LabOfferingsPage';
import { LabsPage } from './pages/LabsPage';
import { MasterAnalytesPage } from './pages/MasterAnalytesPage';
import { MasterTestsPage } from './pages/MasterTestsPage';
import { TransportsPage } from './pages/TransportsPage';

function App() {
  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/labs" element={<LabsPage />} />
            <Route path="/labs/:id" element={<LabDetailPage />} />
            <Route path="/tests" element={<MasterTestsPage />} />
            <Route path="/analytes" element={<MasterAnalytesPage />} />
            <Route path="/offerings" element={<LabOfferingsPage />} />
            <Route path="/transports" element={<TransportsPage />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
