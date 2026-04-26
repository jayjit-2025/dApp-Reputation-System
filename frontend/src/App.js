import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import './App.css';
import { WalletProvider } from './context/WalletContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import EndorsePage from './pages/EndorsePage';
import LookupPage from './pages/LookupPage';

function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} style={{ flexDirection: 'column', gap: 2, padding: '6px 16px', fontSize: 10 }}>
        <span style={{ fontSize: 20 }}>📊</span>
        Dashboard
      </NavLink>
      <NavLink to="/endorse" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} style={{ flexDirection: 'column', gap: 2, padding: '6px 16px', fontSize: 10 }}>
        <span style={{ fontSize: 20 }}>🤝</span>
        Endorse
      </NavLink>
      <NavLink to="/lookup" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} style={{ flexDirection: 'column', gap: 2, padding: '6px 16px', fontSize: 10 }}>
        <span style={{ fontSize: 20 }}>🔍</span>
        Lookup
      </NavLink>
    </nav>
  );
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopNav />
        <div className="app-content">{children}</div>
      </div>
      <MobileNav />
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
