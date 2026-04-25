import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

const TopNav = () => {
  const { connected, connectWallet, connecting, shortKey } = useWallet();
  const location = useLocation();

  // Don't show topnav on landing page
  if (location.pathname === '/') return null;

  return (
    <nav className="topnav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '16px',
            color: 'var(--cyan)',
            marginRight: '20px',
          }}
        >
          RepuTE
        </span>
        <div className="topnav-tabs">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `topnav-tab ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/endorse"
            className={({ isActive }) => `topnav-tab ${isActive ? 'active' : ''}`}
          >
            Endorse
          </NavLink>
          <NavLink
            to="/lookup"
            className={({ isActive }) => `topnav-tab ${isActive ? 'active' : ''}`}
          >
            Lookup
          </NavLink>
        </div>
      </div>

      <div className="topnav-right">
        {connected ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            {shortKey}
          </span>
        ) : null}
        <button
          className="btn-connect"
          onClick={connectWallet}
          disabled={connected || connecting}
        >
          {connecting ? (
            <span className="spinner" />
          ) : connected ? (
            'Connected'
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </nav>
  );
};

export default TopNav;
