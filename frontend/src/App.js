import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { WalletProvider } from './context/WalletContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import EndorsePage from './pages/EndorsePage';
import LookupPage from './pages/LookupPage';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopNav />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            }
          />
          <Route
            path="/endorse"
            element={
              <AppLayout>
                <EndorsePage />
              </AppLayout>
            }
          />
          <Route
            path="/lookup"
            element={
              <AppLayout>
                <LookupPage />
              </AppLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
