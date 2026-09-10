import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { LoginPage } from './pages/LoginPage';
import { IngestionPage } from './pages/IngestionPage';
import { TransactionExplorerPage } from './pages/TransactionExplorerPage';
import { AlertQueuePage } from './pages/AlertQueuePage';
import { CaseListPage } from './pages/CaseListPage';
import { InvestigationWorkspacePage } from './pages/InvestigationWorkspacePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverviewPage />} />
            <Route path="ingestion" element={<IngestionPage />} />
            <Route path="transactions" element={<TransactionExplorerPage />} />
            <Route path="alerts" element={<AlertQueuePage />} />
            <Route path="cases" element={<CaseListPage />} />
            <Route path="workspace" element={<InvestigationWorkspacePage />} />
            <Route path="workspace/:caseId" element={<InvestigationWorkspacePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
