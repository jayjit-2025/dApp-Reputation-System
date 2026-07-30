# Changelog

All notable changes to RepuTE are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.1.0] - 2026-07-30

### Added
- **Custom Review Memos**: Soroban contract & UI support attaching review memos to endorsements
- **Revocation & Update System**: Added contract methods `revoke_endorsement` & `update_endorsement` and Freighter integration
- **Time-Decay Scoring Engine**: Dynamic on-chain time-decay formula applied in `get_score`
- **Specialization Ranks & Badges**: Dynamic role badges based on category score thresholds

---

## [Unreleased]

### Added
- `test_successful_endorsement` — dedicated test verifying score, count, and stored endorsement record after a single valid call
- `test_score_accumulates_across_multiple_endorsers` — verifies that three independent senders each contribute +1 point, resulting in a total score of 3 and endorsement count of 3

### Fixed
- `vercel.json` — added SPA catch-all rewrite rule; direct navigation to `/dashboard`, `/endorse`, and `/lookup` no longer returns 404 on Vercel
- `README.md` — corrected test table: removed non-existent `test_invalid_score_range` and `InvalidScoreRange` error; updated error numbers to match actual contract (`SelfEndorsementNotAllowed = 1`, `AlreadyEndorsed = 2`); updated test count from 4 → 5
- `LICENSE` — added missing MIT license file (was referenced in README badge but file did not exist)

---

## [2.0.0] — 2026-03-22

### Added
- **Soroban smart contract** (`contract/hello_world/src/lib.rs`) — full on-chain reputation logic replacing the previous Horizon `manageData` approach
  - `endorse(sender, target, category)` — stores endorsement with weighted points, emits event
  - `get_score(address)` — returns accumulated reputation score
  - `get_endorsement_count(address)` — returns total number of endorsements received
  - Two custom contract errors: `SelfEndorsementNotAllowed (#1)`, `AlreadyEndorsed (#2)`
- **Weighted endorsement multiplier** — endorser's own score determines how many points they add (0.1x–2.0x tiers)
- **Shareable reputation URL** — Lookup page generates `/lookup?wallet=ADDRESS` deep links; auto-fetches on load
- **Copy Link button** on Lookup page for sharing wallet reputation snapshots outside the app
- **Real-time event polling** — Dashboard polls Soroban RPC every 10 seconds for fresh endorsement events
- **Multi-wallet support** via `@creit.tech/stellar-wallets-kit` (Freighter, xBull, Albedo)
- **Endorsement power display** on Endorse page — shows connected wallet's current multiplier before submission
- GitHub Actions CI pipeline — runs `cargo test` and `npm run build` on every push to `main`
- Vercel deployment configuration (`vercel.json`)

### Changed
- Replaced legacy Freighter-only wallet integration with `StellarWalletsKit` supporting all major Stellar wallets
- Dashboard activity feed now sourced from live Soroban contract events instead of raw Horizon transactions
- Score ring component is now driven by on-chain `get_score` contract query instead of client-side heuristics

### Fixed
- Lookup page clears all previous state (score, events, transactions) before starting a new search, preventing stale data from a prior query bleeding into the next result

---

## [1.0.0] — 2026-03-10

### Added
- Initial React frontend with Landing, Dashboard, Endorse, and Lookup pages
- Freighter wallet integration for Stellar Testnet
- On-chain endorsement storage using Stellar `manageData` operations
- Score aggregation by scanning account transaction history for `repute:` prefixed data entries
- Dark-mode "Sovereign Ledger" design system with cyan/teal accent tokens
- Animated SVG score ring component
- Mobile-responsive layout with collapsible sidebar and bottom navigation
- Stellar Expert deep-link integration for transaction verification
