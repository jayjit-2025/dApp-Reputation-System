import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

const LandingPage = () => {
  const { connected, connecting, connectWallet, shortKey } = useWallet();
  const navigate = useNavigate();

  const handleConnect = async () => {
    await connectWallet();
  };

  // If already connected, show option to go to dashboard
  React.useEffect(() => {
    if (connected) {
      const timeout = setTimeout(() => navigate('/dashboard'), 1200);
      return () => clearTimeout(timeout);
    }
  }, [connected, navigate]);

  return (
    <div className="landing">
      {/* Connected badge top-right */}
      {connected && (
        <div className="landing-connected">
          <div className="landing-connected-card">
            <div>
              <div className="landing-connected-label">Connected Account</div>
              <div className="landing-connected-addr">{shortKey}</div>
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 8px var(--green)',
              }}
            />
          </div>
        </div>
      )}

      <div className="landing-content animate-in">
        {/* Shield icon */}
        <div className="landing-shield">🛡️</div>

        {/* Title */}
        <h1 className="landing-title">RepuTE</h1>
        <p className="landing-subtitle">Trust is earned. Reputation is proof.</p>

        {/* Connect card */}
        <div className="landing-card">
          <button
            className="landing-btn"
            onClick={handleConnect}
            disabled={connecting || connected}
          >
            {connecting ? (
              <>
                <span className="spinner" />
                Connecting...
              </>
            ) : connected ? (
              <>✓ Connected — Redirecting...</>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M22 10h-6a2 2 0 00-2 2v0a2 2 0 002 2h6" />
                  <circle cx="18" cy="12" r="1" />
                </svg>
                Connect Freighter Wallet
              </>
            )}
          </button>

          <p className="landing-helper">
            Your wallet is your identity. No signup needed.
          </p>

          <div className="landing-stats">
            <div>
              <div className="landing-stat-label">Protocol Status</div>
              <div className="landing-stat-value">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--green)',
                    display: 'inline-block',
                    boxShadow: '0 0 6px var(--green)',
                  }}
                />
                Testnet Live
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="landing-stat-label">Active Nodes</div>
              <div className="landing-stat-value">
                14,200 Verified
              </div>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="landing-footer">
          <a href="#docs">Documentation</a>
          <a href="#gov">Governance</a>
          <a href="#pricing">Pricing</a>
        </div>
      </div>

      {/* Bottom brand */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-muted)',
          fontSize: 14,
          fontFamily: 'var(--font-display)',
        }}
      >
        <span style={{ fontSize: 18 }}>⚡</span>
        Stellar Cipher
      </div>
    </div>
  );
};

export default LandingPage;
