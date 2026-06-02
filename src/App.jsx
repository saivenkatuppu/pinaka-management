import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import PigletRecord from './pages/PigletRecord';
import PigletDetailPage from './features/piglets/pages/PigletDetailPage';
import SowRecord from './pages/SowRecord';
import SowDetailPage from './features/sows/pages/SowDetailPage';
import BoarRecord from './pages/BoarRecord';
import BoarDetailPage from './features/boars/pages/BoarDetailPage';
import BreedingRecord from './pages/BreedingRecord';
import BreedingDetailPage from './features/breeding/pages/BreedingDetailPage';
import FarrowingRecord from './pages/FarrowingRecord';
import FarrowingDetailPage from './features/farrowing/pages/FarrowingDetailPage';
import ParityRecord from './pages/ParityRecord';
import ParityDetailPage from './features/parity/pages/ParityDetailPage';
import AnimalStockRecord from './pages/AnimalStockRecord';
import AnimalStockDetailPage from './features/stock/pages/AnimalStockDetailPage';
import TreatmentRecord from './pages/TreatmentRecord';
import MedicineRecord from './pages/MedicineRecord';
import MortalityRecord from './pages/MortalityRecord';
import SaleRecord from './pages/SaleRecord';
import Settings from './pages/Settings';
import FarmStructureRecord from './pages/FarmStructureRecord';

// View Placeholder wrapped in our high-fidelity MainLayout
const ViewPlaceholder = ({ title }) => (
  <MainLayout>
    <div className="op-card max-w-4xl mx-auto w-full py-12 text-center my-8">
      <h2 className="text-sm font-bold text-primary mb-2 uppercase tracking-widest">{title} Register</h2>
      <p className="text-xs text-textSecondary max-w-md mx-auto leading-relaxed">
        This module is fully mapped in the base routing architecture. The production view, filters, record actions, and forms will load dynamically in Phase 6.
      </p>
      <div className="mt-6 flex justify-center">
        <a 
          href="/" 
          className="px-4 py-2 bg-sidebar text-xs text-textPrimary hover:bg-cardBg hover:text-primary rounded border border-borderDark transition-all uppercase tracking-wider font-bold"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  </MainLayout>
);

import Dashboard from './pages/Dashboard';

// App Routing System
export default function App() {
  const { initSession } = useAuthStore();

  useEffect(() => {
    // Attempt session revalidation on mount
    initSession();
  }, [initSession]);

  return (
    <Router>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Core Sidebar Modules */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/piglets" element={<ProtectedRoute><PigletRecord /></ProtectedRoute>} />
        <Route path="/piglets/:id" element={<ProtectedRoute><PigletDetailPage /></ProtectedRoute>} />
        <Route path="/sows" element={<ProtectedRoute><SowRecord /></ProtectedRoute>} />
        <Route path="/sows/:id" element={<ProtectedRoute><SowDetailPage /></ProtectedRoute>} />
        <Route path="/boars" element={<ProtectedRoute><BoarRecord /></ProtectedRoute>} />
        <Route path="/boars/:id" element={<ProtectedRoute><BoarDetailPage /></ProtectedRoute>} />
        <Route path="/breeding" element={<ProtectedRoute><BreedingRecord /></ProtectedRoute>} />
        <Route path="/breeding/:id" element={<ProtectedRoute><BreedingDetailPage /></ProtectedRoute>} />
        <Route path="/farrowing" element={<ProtectedRoute><FarrowingRecord /></ProtectedRoute>} />
        <Route path="/farrowing/:id" element={<ProtectedRoute><FarrowingDetailPage /></ProtectedRoute>} />
        <Route path="/parity" element={<ProtectedRoute><ParityRecord /></ProtectedRoute>} />
        <Route path="/parity/:id" element={<ProtectedRoute><ParityDetailPage /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute><AnimalStockRecord /></ProtectedRoute>} />
        <Route path="/stock/:id" element={<ProtectedRoute><AnimalStockDetailPage /></ProtectedRoute>} />
        <Route path="/treatment" element={<ProtectedRoute><TreatmentRecord /></ProtectedRoute>} />
        <Route path="/medicine" element={<ProtectedRoute><MedicineRecord /></ProtectedRoute>} />
        <Route path="/mortality" element={<ProtectedRoute><MortalityRecord /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SaleRecord /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/structure" element={<ProtectedRoute><FarmStructureRecord /></ProtectedRoute>} />

        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
