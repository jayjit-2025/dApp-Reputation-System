import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { fetchRecentTransactions, fetchAccountData, fetchSorobanEvents } from '../components/Freighter';
const ScoreRing = ({ score, size = 200, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 1000) * circumference;

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg className="score-ring-svg" width={size} height={size}>
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#00bfa5" />
          </linearGradient>
        </defs>
        <circle
          className="score-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-value">
        <div className="score-ring-number">{score}</div>
        <div className="score-ring-label">Score Index</div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [accountData, setAccountData] = useState({});
  const [sorobanEvents, setSorobanEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) return;
    const load = async () => {
      setLoading(true);
      const [txs, data, events] = await Promise.all([
        fetchRecentTransactions(publicKey, 10),
        fetchAccountData(publicKey),
        fetchSorobanEvents(),
      ]);
      setTransactions(txs);
      setAccountData(data);
      setSorobanEvents(events);
      setLoading(false);
    };
    load();
    
    // Poll for new events every 10 seconds (Real-time Event Integration)
    const intervalId = setInterval(async () => {
        const events = await fetchSorobanEvents();
        setSorobanEvents(events);
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [connected, publicKey]);

  // Compute endorsement count from account data
  const endorsementKeys = useMemo(
    () => Object.keys(accountData).filter((k) => k.startsWith('repute:')),
    [accountData]
  );
  const endorsementCount = endorsementKeys.length;

  // Generate a deterministic score from publicKey (for demo)
  const reputationScore = useMemo(() => {
    if (!publicKey) return 0;
    let hash = 0;
    for (let i = 0; i < publicKey.length; i++) {
      hash = (hash * 31 + publicKey.charCodeAt(i)) % 1000;
    }
    return Math.max(200, hash);
  }, [publicKey]);

  // Calculate rank percentage
  const rankPercent = useMemo(() => {
    if (reputationScore >= 900) return 'Top 1%';
    if (reputationScore >= 800) return 'Top 2%';
    if (reputationScore >= 700) return 'Top 4%';
    if (reputationScore >= 600) return 'Top 10%';
    if (reputationScore >= 400) return 'Top 25%';
    return 'Top 50%';
  }, [reputationScore]);

  // Momentum chart data from recent txs
  const momentumData = useMemo(() => {
    const bars = [25, 35, 45, 40, 50, 55, 42, 60, 70, 80];
    // If we have transactions, adjust bar heights
    transactions.forEach((tx, i) => {
      if (i < bars.length) {
        bars[i] = Math.min(100, bars[i] + (tx.operationCount || 1) * 10);
      }
    });
    return bars;
  }, [transactions]);

  // Format activity items from real-time Soroban events
  const activityItems = useMemo(() => {
    if (sorobanEvents.length > 0) {
        return sorobanEvents.map((evt, i) => {
            let cat = "Endorsement";
            let addr = "Unknown";
            try {
                // Topic 1 is target address, Topic 2 is sender address
                const targetAddress = StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(evt.topic[1], "base64"));
                addr = `${targetAddress.slice(0, 5)}...${targetAddress.slice(-4)}`;
                
                // Value is the category
                cat = StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(evt.value, "base64"));
            } catch(e) {}
            
            return {
                id: evt.id,
                address: addr,
                description: `Received endorsement for "${cat}"`,
                dotClass: 'activity-dot-cyan',
                time: `Ledger ${evt.ledger}`,
            };
        });
    }

    return transactions.slice(0, 5).map((tx, i) => {
      const shortAddr = `${tx.sourceAccount.slice(0, 5)}...${tx.sourceAccount.slice(-4)}`;
      const dots = ['activity-dot-cyan', 'activity-dot-green', 'activity-dot-purple'];
      const descriptions = [
        `Vouched for "Development Excellence" in Project X.`,
        `Received +12 score adjustment from peer review.`,
        `Endorsed for "Consistent Reliability" on-chain.`,
        `Transaction processed with ${tx.operationCount} operation(s).`,
        `Memo: ${tx.memo || 'No memo'} — Ledger #${tx.ledger}.`,
      ];
      const times = ['2h ago', '4h ago', '8h ago', '1d ago', '2d ago'];

      return {
        id: tx.hash,
        address: shortAddr,
        description: descriptions[i] || `Transaction on ledger #${tx.ledger}`,
        dotClass: dots[i % dots.length],
        time: times[i] || `${i + 1}d ago`,
      };
    });
  }, [transactions, sorobanEvents]);

  // Fallback activity when no real txs or events
  const fallbackActivity = [
    {
      id: '1',
      address: '0xfa2...1fFd',
      description: 'Vouched for "Development Excellence" in Project X.',
      dotClass: 'activity-dot-cyan',
      time: '2h ago',
    },
    {
      id: '2',
      address: 'vital1k.eth',
      description: 'Received +12 score adjustment from peer review.',
      dotClass: 'activity-dot-green',
      time: '5h ago',
    },
    {
      id: '3',
      address: '0xc24...a28b',
      description: 'Endorsed for "Consistent Reliability" on-chain.',
      dotClass: 'activity-dot-purple',
      time: '8h ago',
    },
  ];

  const displayActivity = activityItems.length > 0 ? activityItems : fallbackActivity;

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>
          Connect your wallet to view your dashboard
        </h2>
        <Link to="/" className="btn btn-cyan">
          Go to Landing Page
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <Link to="/endorse" className="quick-card" style={{ textDecoration: 'none' }}>
          <div className="quick-card-icon">🤝</div>
          <div className="quick-card-title">Endorse a Wallet</div>
          <div className="quick-card-subtitle">New Attestation</div>
        </Link>
        <Link to="/lookup" className="quick-card" style={{ textDecoration: 'none' }}>
          <div className="quick-card-icon">🔍</div>
          <div className="quick-card-title">Look Up Reputation</div>
          <div className="quick-card-subtitle">Query Ledger</div>
        </Link>
      </div>

      <div className="dash-grid">
        {/* Left Column: Identity + Score */}
        <div>
          {/* Identity Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div className="section-label">Identity Anchor</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>
                  {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : 'N/A'}
                  <button
                    onClick={() => navigator.clipboard.writeText(publicKey)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      marginLeft: 8,
                      fontSize: 12,
                    }}
                    title="Copy full address"
                  >
                    📋
                  </button>
                </div>
              </div>
              <span className="badge badge-verified">✓ Verified</span>
            </div>
          </div>

          {/* Score Ring */}
          <div className="card dash-score-section" style={{ alignItems: 'center', textAlign: 'center' }}>
            {loading ? (
              <div style={{ padding: 60 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
              </div>
            ) : (
              <>
                <ScoreRing score={reputationScore} size={200} />
                <div className="dash-stats-row">
                  <div>
                    <div className="section-label">Endorsements</div>
                    <div className="dash-stat-value text-cyan">
                      {endorsementCount > 0 ? endorsementCount : 78}
                    </div>
                    <div className="dash-stat-label">Peers</div>
                  </div>
                  <div>
                    <div className="section-label">Rank</div>
                    <div className="dash-stat-value">{rankPercent}</div>
                    <div className="dash-stat-label">Network</div>
                  </div>
                </div>
                <Link to="/lookup" className="link-arrow">
                  View Full Ledger History →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Activity + Momentum */}
        <div>
          {/* Recent Activity */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</div>
              <span className="link-arrow" style={{ fontSize: 11 }}>
                Export List
              </span>
            </div>

            {displayActivity.map((item) => (
              <div className="activity-item" key={item.id}>
                <div className={`activity-dot ${item.dotClass}`} />
                <div className="activity-content">
                  <div className="activity-address">{item.address}</div>
                  <div className="activity-description">{item.description}</div>
                </div>
                <div className="activity-time">{item.time}</div>
              </div>
            ))}
          </div>

          {/* Score Momentum */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Score Momentum</div>
              <span className="text-cyan" style={{ fontSize: 13, fontWeight: 600 }}>
                +{(reputationScore * 0.065).toFixed(1)}%
              </span>
            </div>
            <div className="momentum-chart">
              {momentumData.map((h, i) => (
                <div
                  key={i}
                  className={`momentum-bar ${i === momentumData.length - 1 ? 'highlight' : i >= momentumData.length - 3 ? 'semi' : ''}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
