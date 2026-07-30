import React from 'react';

const BADGE_RULES = [
  { category: 'Development Excellence', label: 'Dev Master', icon: '💻', color: 'var(--cyan)' },
  { category: 'Security Auditor', label: 'Shield Auditor', icon: '🛡️', color: '#ff4081' },
  { category: 'Liquidity Provider', label: 'Liquidity Titan', icon: '💧', color: '#00e676' },
  { category: 'Top-tier Validator', label: 'Stellar Validator', icon: '⚡', color: '#ffab00' },
  { category: 'Protocol Governance', label: 'Protocol Governor', icon: '🏛️', color: '#7c4dff' },
  { category: 'Consistent Reliability', label: 'Trust Pillar', icon: '⚓', color: '#00b0ff' },
];

export const getSpecializationBadges = (endorsements = []) => {
  const categoryCounts = {};
  endorsements.forEach((e) => {
    const cat = e.category || e;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return BADGE_RULES.filter((rule) => (categoryCounts[rule.category] || 0) >= 1).map((rule) => ({
    ...rule,
    count: categoryCounts[rule.category],
  }));
};

const SpecializationBadges = ({ endorsements = [] }) => {
  const badges = getSpecializationBadges(endorsements);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {badges.map((b) => (
        <span
          key={b.label}
          className="badge"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${b.color}`,
            color: b.color,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{b.icon}</span>
          <span>{b.label}</span>
          <span style={{ opacity: 0.7, fontSize: 10 }}>({b.count})</span>
        </span>
      ))}
    </div>
  );
};

export default SpecializationBadges;
