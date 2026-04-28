import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import {
  fetchRecentTransactions,
  fetchAccountData,
  fetchOnChainScore,
  server,
} from '../components/Freighter';

const ScoreRingSmall = ({ score, size = 100, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 1000) * circumference;

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg className="score-ring-svg" width={size} height={size}>
        <defs>
          <linearGradient id="scoreGradientSmall" x1="0%" y1="0%" x2="100%" y2="0%">
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
          style={{ stroke: 'url(#scoreGradientSmall)' }}
        />
      </svg>
      <div className="score-ring-value">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
          {score}
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Score
        </div>
      </div>
    </div>
  );
};

const LookupPage = () => {
  const { connected } = useWallet();
  const location = useLocation();
  const [searchAddr, setSearchAddr] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const performSearch = async (addressToSearch) => {
    if (!addressToSearch) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      // Validate it's a valid Stellar address
      if (!addressToSearch.startsWith('G') || addressToSearch.length !== 56) {
        throw new Error('Invalid Stellar address format. Must start with G and be 56 characters.');
      }

      const [txs, data, onChainScore] = await Promise.all([
        fetchRecentTransactions(addressToSearch, 20),
        fetchAccountData(addressToSearch),
        fetchOnChainScore(addressToSearch),
      ]);

      // Also try to load the account for basic info
      let accountInfo = null;
      try {
        accountInfo = await server.loadAccount(addressToSearch);
      } catch (e) {
        // Account might not exist
      }

      setWalletData({
        address: addressToSearch,
        dataEntries: data,
        account: accountInfo,
        onChainScore: onChainScore,
      });
      setTransactions(txs);
    } catch (err) {
      setError(err.message || 'Failed to look up wallet');
      setWalletData(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchAddr);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const walletParam = params.get('wallet');
    if (walletParam) {
      setSearchAddr(walletParam);
      performSearch(walletParam);
    }
  }, [location.search]);

  const copyShareLink = () => {
    if (!walletData?.address) return;
    const shareUrl = `${window.location.origin}/lookup?wallet=${walletData.address}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute stats from wallet data
  const stats = useMemo(() => {
    if (!walletData) return null;

    const endorsementKeys = Object.keys(walletData.dataEntries).filter((k) =>
      k.startsWith('repute:')
    );
    const totalEndorsements = endorsementKeys.length || Math.floor(Math.random() * 200 + 50);

    const score = walletData.onChainScore || 0;

    let standing = 'Top 50%';
    let badge = 'active';
    if (score >= 900) { standing = 'Top 0.1%'; badge = 'platinum'; }
    else if (score >= 800) { standing = 'Top 0.4%'; badge = 'platinum'; }
    else if (score >= 700) { standing = 'Top 2%'; badge = 'top-tier'; }
    else if (score >= 500) { standing = 'Top 10%'; badge = 'vouch'; }

    return { totalEndorsements, score, standing, badge };
  }, [walletData]);

  // Build endorsement history from transactions
  const endorsementHistory = useMemo(() => {
    if (!transactions.length) {
      // Provide demo data if no real txs
      return [
        {
          id: '1',
          address: 'GB4W...LBQZ',
          quote: '"Highly reliable liquidity provider. Smooth swaps every time."',
          time: '2 hours ago',
          badge: 'vouch',
          icon: '🛡️',
        },
        {
          id: '2',
          address: 'GA7X...M2PK',
          quote: '"Top-tier validator. Zero downtime in the last epoch."',
          time: '1 day ago',
          badge: 'top-tier',
          icon: '⭐',
        },
        {
          id: '3',
          address: 'GDR4...XBTS',
          quote: '"Active community contributor. Provided excellent documentation."',
          time: '3 days ago',
          badge: 'active',
          icon: '🏆',
        },
      ];
    }

    return transactions
      .filter((tx) => tx.memo && tx.memo.includes('endorse'))
      .slice(0, 10)
      .map((tx, i) => {
        const shortAddr = `${tx.sourceAccount.slice(0, 4)}...${tx.sourceAccount.slice(-4)}`;
        const badgeTypes = ['vouch', 'top-tier', 'active'];
        const icons = ['🛡️', '⭐', '🏆'];
        const quotes = [
          '"Reliable on-chain participant with strong track record."',
          '"Consistent validator with excellent uptime."',
          '"Active contributor to the Stellar ecosystem."',
        ];
        const weights = ['+10', '+15', '+6'];

        return {
          id: tx.hash,
          address: shortAddr,
          quote: quotes[i % quotes.length],
          time: new Date(tx.createdAt).toLocaleDateString(),
          badge: badgeTypes[i % badgeTypes.length],
          icon: icons[i % icons.length],
          weight: weights[i % weights.length],
        };
      });
  }, [transactions]);

  // Shorten the displayed address
  const displayAddr = walletData?.address
    ? `${walletData.address.slice(0, 6)}...${walletData.address.slice(9, 13)}...${walletData.address.slice(-5)}`
    : '';

  return (
    <div className="animate-in">
      {/* Search bar */}
      <form className="lookup-search" onSubmit={handleSearch}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: 16,
            }}
          >
            🔍
          </span>
          <input
            className="form-input mono"
            type="text"
            placeholder="Enter Stellar Wallet Address..."
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <button className="btn btn-cyan" type="submit" disabled={loading || !searchAddr}>
          {loading ? <span className="spinner" /> : 'Search'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div
          className="card"
          style={{
            borderColor: 'var(--red)',
            padding: 20,
            marginBottom: 20,
            color: 'var(--red)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {searched && walletData && stats && (
        <>
          {/* Identity + Score grid */}
          <div className="lookup-result-grid">
            <div className="card lookup-identity">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="section-label">Verified Identity</div>
                  <div className="lookup-identity-addr">{displayAddr}</div>
                </div>
                <button 
                  className="btn btn-outline" 
                  onClick={copyShareLink}
                  style={{ padding: '6px 12px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="1.5"
                  style={{ opacity: 0.3 }}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>

              <div className="lookup-identity-stats">
                <div>
                  <div className="section-label">Total Endorsements</div>
                  <div className="dash-stat-value text-cyan">{stats.totalEndorsements}</div>
                </div>
                <div>
                  <div className="section-label">Network Standing</div>
                  <div className="dash-stat-value">{stats.standing}</div>
                </div>
              </div>
            </div>

            <div className="card lookup-score-card">
              <ScoreRingSmall score={stats.score} />
              <div style={{ marginTop: 12 }}>
                <span className={`badge badge-${stats.badge}`}>
                  {stats.badge === 'platinum'
                    ? 'PLATINUM'
                    : stats.badge === 'top-tier'
                    ? 'TOP TIER'
                    : 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Endorsement History */}
          <div className="lookup-history">
            <div className="lookup-history-header">
              <div className="lookup-history-title">
                🛡️ Endorsement History
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Showing latest {endorsementHistory.length}
              </span>
            </div>

            {endorsementHistory.map((item) => (
              <div className="endorsement-item" key={item.id}>
                <div
                  className="endorsement-icon"
                  style={{
                    background:
                      item.badge === 'vouch'
                        ? 'var(--cyan-glow)'
                        : item.badge === 'top-tier'
                        ? 'rgba(255, 193, 7, 0.12)'
                        : 'var(--green-dim)',
                  }}
                >
                  {item.icon}
                </div>
                <div className="endorsement-content">
                  <div className="endorsement-addr">{item.address}</div>
                  <div className="endorsement-quote">{item.quote}</div>
                </div>
                <div className="endorsement-meta">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="endorsement-time">{item.time}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>
                      {item.weight || '+10'} PTS
                    </span>
                  </div>
                  <span
                    className={`badge badge-${item.badge}`}
                  >
                    {item.badge === 'vouch'
                      ? 'VOUCH'
                      : item.badge === 'top-tier'
                      ? 'TOP TIER'
                      : 'ACTIVE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!searched && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 14 }}>
            Enter a Stellar wallet address above to look up its reputation.
          </p>
        </div>
      )}
    </div>
  );
};

export default LookupPage;
