import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { submitEndorsement } from '../components/Freighter';

const CATEGORIES = [
  'Development Excellence',
  'Consistent Reliability',
  'Community Contribution',
  'Liquidity Provider',
  'Top-tier Validator',
  'Security Auditor',
  'Protocol Governance',
];

const EndorsePage = () => {
  const { connected, publicKey } = useWallet();
  const [targetAddress, setTargetAddress] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [score, setScore] = useState(750);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success, hash, error }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetAddress || !publicKey) return;

    setSubmitting(true);
    const res = await submitEndorsement(publicKey, targetAddress, category, score);
    setResult(res);
    setSubmitting(false);
  };

  const resetForm = () => {
    setTargetAddress('');
    setCategory(CATEGORIES[0]);
    setScore(750);
    setResult(null);
  };

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>
          Connect your wallet to endorse
        </h2>
        <Link to="/" className="btn btn-cyan">
          Go to Landing Page
        </Link>
      </div>
    );
  }

  // Success state
  if (result?.success) {
    const shortHash = result.hash
      ? `${result.hash.slice(0, 6)}...${result.hash.slice(-4)}`
      : 'N/A';

    return (
      <div className="endorse-container animate-in">
        <div className="card" style={{ padding: 40 }}>
          <div className="endorse-success">
            {/* Success icon */}
            <div className="endorse-success-icon">✓</div>

            <h2>Endorsement submitted on-chain</h2>
            <p>
              The reputation fragment has been successfully
              <br />
              cryptographically signed and broadcasted.
            </p>

            <hr className="divider" />

            {/* Transaction hash */}
            <div className="endorse-tx-row">
              <div>
                <div className="section-label">Transaction Hash</div>
                <span
                  className="mono text-cyan"
                  style={{ fontSize: 13, cursor: 'pointer' }}
                  onClick={() => {
                    navigator.clipboard.writeText(result.hash);
                    alert('Transaction hash copied!');
                  }}
                  title="Click to copy full hash"
                >
                  {shortHash} 📋
                </span>
              </div>
            </div>

            {/* Stellar Explorer Button */}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                width: '100%',
                marginTop: 16,
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #0d2e3e, #0a1e2e)',
                border: '1px solid var(--cyan)',
                color: 'var(--cyan)',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--cyan)';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 229, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #0d2e3e, #0a1e2e)';
                e.currentTarget.style.color = 'var(--cyan)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View on Stellar Explorer
            </a>

            {/* Reputation delta card */}
            <div className="endorse-delta-card">
              <div className="section-label">Reputation Delta Applied</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 36,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {score}
                </span>
                <span className="badge badge-max">MAX</span>
              </div>

              {/* Mini momentum chart */}
              <div className="momentum-chart" style={{ height: 40, marginTop: 12 }}>
                {[20, 35, 25, 45, 50, 60, 75].map((h, i) => (
                  <div
                    key={i}
                    className={`momentum-bar ${i >= 5 ? 'highlight' : 'semi'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="endorse-buttons">
              <button className="btn btn-cyan" onClick={resetForm}>
                Endorse Another →
              </button>
              <Link to="/dashboard" className="btn btn-outline">
                📊 Go to Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          ● SUBMITTED RECEIPT &nbsp;&nbsp; ● FINALIZED
        </div>
      </div>
    );
  }

  // Error state
  if (result && !result.success) {
    return (
      <div className="endorse-container animate-in">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255, 82, 82, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 20px',
            }}
          >
            ✕
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Transaction Failed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
            {result.error}
          </p>
          <button className="btn btn-cyan" onClick={resetForm}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="endorse-container animate-in">
      <div className="card" style={{ padding: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Endorse a Wallet
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>
          Submit an on-chain attestation for a Stellar wallet address.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Target Wallet Address</label>
            <input
              className="form-input mono"
              type="text"
              placeholder="G... (Stellar public key)"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Endorsement Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reputation Score (1–1000)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              max="1000"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
            <div
              style={{
                marginTop: 8,
                height: 4,
                background: 'var(--border-default)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(score / 1000) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--cyan), var(--teal))',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>

          <button
            className="btn btn-cyan"
            type="submit"
            disabled={submitting || !targetAddress}
            style={{ width: '100%', marginTop: 8 }}
          >
            {submitting ? (
              <>
                <span className="spinner" /> Signing & Submitting...
              </>
            ) : (
              <>Submit Endorsement →</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EndorsePage;
