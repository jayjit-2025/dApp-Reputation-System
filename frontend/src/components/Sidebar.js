import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

const Sidebar = () => {
  const { connected, shortKey, publicKey, disconnectWallet } = useWallet();
  const location = useLocation();

  // Don't show sidebar on landing page
  if (location.pathname === '/') return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>RepuTE</h1>
        <p>The Sovereign Ledger</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink
          to="/endorse"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Endorse
        </NavLink>

        <NavLink
          to="/lookup"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          Lookup
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {connected && (
          <>
            <div className="sidebar-wallet">
              <div className="sidebar-wallet-avatar">
                {publicKey ? publicKey.slice(0, 2) : '??'}
              </div>
              <div className="sidebar-wallet-info">
                <div className="sidebar-wallet-addr">{shortKey}</div>
                <div className="sidebar-wallet-status">Connected</div>
              </div>
            </div>
            <button className="sidebar-disconnect" onClick={disconnectWallet}>
              Disconnect
            </button>
          </>
        )}

        <div className="sidebar-network">
          <div className="sidebar-network-label">Network Status</div>
          <div className="sidebar-network-value">
            <span className="sidebar-network-dot" />
            Testnet v2.0
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
