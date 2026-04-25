<div align="center">
  <h1>RepuTE</h1>
  <p><b>Stellar On-Chain Reputation System: Trust is earned. Reputation is proof.</b></p>

  <a href="https://d-app-reputation-system-xmjy.vercel.app"><img src="https://img.shields.io/badge/🚀_Live_Demo-Visit_App-00e5ff?style=for-the-badge" /></a>

  <img src="https://img.shields.io/badge/React-black?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Stellar-E84142?style=for-the-badge&logo=stellar&logoColor=white" />
  <img src="https://img.shields.io/badge/Freighter-3178C6?style=for-the-badge&logo=web3.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-339933?style=for-the-badge" />
  
  <br><br>

  <img width="100%" alt="RepuTE Dashboard Screenshot" src="assets/dashboard.png" />

  <br><br>

  <i>RepuTE is a decentralized reputation infrastructure allowing users to issue and look up cryptographically signed endorsements on the Stellar network.</i>

  <br><br>

  <a href="#protocol">On-Chain Protocol</a> • 
  <a href="#architecture">Architecture</a> • 
  <a href="#ui-refresh">RepuTE v2.0</a> • 
  <a href="#plan">Pipeline</a> • 
  <a href="#setup">Quick Start</a>
</div>

---

<a name="ui-refresh"></a>
## 🌟 Enterprise UI Overhaul (v2.0)

RepuTE features a high-density **Sovereign Ledger Aesthetic**, built for maximum clarity and institutional trust.

### ✨ Key New Features
- 🌘 **"True Black" Design System**: Deep slate surfaces with cyan glow accents for high-end readability.
- ⭕ **Animated Score Index**: A real-time reputation ring that scales visually as trust fragments are added on-chain.
- ⚡ **Freighter-Native Integration**: One-click authentication and transaction signing directly from the landing page.
- 📊 **Momentum Analytics**: Visual bar charts tracking reputation delta and transaction density over time.
- 🔗 **Deep Explorer Linking**: Every endorsement is tied to a verifiable Stellar transaction hash with a dedicated tracking portal.

---

## 📖 What is this?

**RepuTE** is a reputation economy infrastructure built on Stellar. It solves the "trust gap" in decentralized ecosystems by allowing anyone to endorse a wallet with a specific category (e.g., *Dev Excellence*, *Liquidity Provider*) and a reputation score.

Every endorsement is **immutable**, stored as a `manageData` operation on the Stellar testnet ledger. Give it a wallet address — it automatically:

1. **Fetches the identity** anchor from the Stellar Horizon network.
2. **Aggregates endorsements** stored across the transaction history.
3. **Calculates a score index** based on the frequency and quality of peer trust fragments.
4. **Visualizes the rank** (e.g., Top 25%) within the global RepuTE network.
5. **Logs every action** on-chain ensuring a 1:1 audit trail.

---

## 🔑 Why Stellar?

> **The efficiency layer for global reputation fragments**

### The Problem
Trust systems on traditional chains suffer from:
- **Prohibitive costs** for small social endorsements.
- **Privacy issues** when storing large social graphs.
- **Complexity** in retrieving historical trust snapshots.

### Why We Chose Stellar

| Feature | Legacy Systems | RepuTE on Stellar |
|:--- |:--- |:--- |
| **Transaction Fees** | High & Volatile | ✅ **Fractional & Constant** |
| **Settlement Speed** | 10s to 15m | ✅ **5s Finality** |
| **Data Storage** | Expensive Bloat | ✅ **Optimized `manageData` Ops** |
| **Account Identity** | Monolithic | ✅ **Native G-Address Anchors** |
| **Accessibility** | Siloed | ✅ **Interoperable SDKs** |

---

<a name="architecture"></a>
## 🏗️ Architecture

### High-Level Flow

```mermaid
graph TD
    A["Stellar Testnet (Horizon)"]
    B(["Wallet / User"])
    
    subgraph Reputation_Protocol ["RepuTE Protocol"]
        C["Endorsement Engine<br/>Identity Anchor"]
        D["Transaction Signing<br/>Freighter Wallet"]
        E{verifyData}
        F["On-Chain Data Storage<br/>(manageData)"]
        G["Score Aggregation"]
    end

    B ---|Connect / Endorse| C
    C ---|1. Sign Request| D
    D ---|2. Submit Tx| A
    A ---|3. Fetch History| E
    E ---|Found Data| F
    F ---|Trust Fragments| G
    G ---|Result| B
```

The architecture ensures data integrity:
1. **Endorser**: Selects a target address and category, then signs a transaction.
2. **Protocol**: Stores raw endorsement data into a `manageData` entry keyed to the target's address fragment.
3. **Ledger**: The transaction hash becomes the permanent proof of this social trust.
4. **Client**: The Dashboard reads the ledger state to reconstruct the reputation profile.

---

## 🛠️ Tech Stack & Tools

- **React 19**: Modern frontend engine for high-density reactive components.
- **Stellar SDK**: High-level library for communicating with the Stellar network.
- **Freighter API**: The official Stellar wallet interface for secure keys handling.
- **CSS3 Design System**: Custom-built design system with HSL dark mode tokens.
- **React Router**: For seamless navigation between Dashboard, Endorse, and Lookup.
- **Stellar Expert**: Integrated for deep transaction inspection.

---

<a name="contract"></a>
## 🔗 Deployed Contract
**Address**: `CCE4HERRLNWDJYGOD637TQCHZSMEY6TODMXL3R6GLLPZJKFDJU42TFIT`
- [View on Stellar.Expert Explorer](https://stellar.expert/explorer/testnet/contract/CCE4HERRLNWDJYGOD637TQCHZSMEY6TODMXL3R6GLLPZJKFDJU42TFIT)

### 📸 Smart Contract Dashboard
<img width="1919" height="865" alt="Screenshot 2026-03-20 151723" src="https://github.com/user-attachments/assets/5c216acd-7326-4c7c-881e-a334a7395225" />


---

## ✅ Proof of Payment

> **Real transaction on Stellar Soroban Testnet**

| Field | Value |
|:---|:---|
| **Transaction Hash** | [`7024344d6915a9cfea5cf8f41120484f7a2787ab97181cfedcf90c067bf37a42`](https://stellar.expert/explorer/testnet/tx/7024344d6915a9cfea5cf8f41120484f7a2787ab97181cfedcf90c067bf37a42) |
| **Function Called** | `Reputaion statement ` |
| **Reputaion Hash** | `7024344d6915a9cfea5cf8f41120484f7a2787ab97181cfedcf90c067bf37a42` |
| **Status** | ✅ Success |
| **Network** | Stellar Soroban (Testnet) |
| **Processed** | `Sun, Mar 22, 2026, 05:56:31 UTC` |
| **Fee Charged** | `0.00001 XLM` |

🔗 [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/7024344d6915a9cfea5cf8f41120484f7a2787ab97181cfedcf90c067bf37a42))

### 📸 Transaction Proof Screenshot
<img width="1915" height="861" alt="Screenshot 2026-03-22 114917" src="https://github.com/user-attachments/assets/6dd03522-082c-4bfc-a281-7dab00070dd5" />


---

<a name="plan"></a>
## 🏗️ Pipeline (Operation Flow)

```mermaid
graph LR
    Connect["Connect Wallet"] --> Action["Select Target Wallet"]
    Action --> Sign["Sign Endorsement<br/>Stellar Tx"]
    Sign --> Broadcast["Broadcast to Ledger"]
    Broadcast --> Confirm["Success View<br/>Tx Hash Result"]
    Confirm --> Dashboard["Score Aggregated"]
```

### 1. Protocol Functions
- **`Connect`**: Auth via Freighter to establish the identity anchor.
- **`Endorse(addr, cat, score)`**: 
  - Builds a Stellar transaction with custom `manageData`.
  - Submits to Horizon for permanent storage.
- **`Lookup(addr)`**: 
  - Scans account history for `repute:` prefixed data.
  - Reconstructs the historical trust graph.

### 2. Supported Wallets
- **Freighter Wallet** (Native Support)
- **Stellar Browser Extension**

---

## 📁 Project Structure

```text
.
├── README.md                # Project documentation
└── stellar-connect-wallet    # Frontend Application
    ├── public/              # Static assets & Branding
    └── src/
        ├── context/         # Wallet State Provider
        ├── components/      # Sidebar, TopNav, Freighter Utils
        ├── pages/           # Dashboard, Endorse, Lookup, Landing
        ├── App.js           # Router & Layout
        └── App.css          # Design System Styles
```

---

<a name="setup"></a>
## ⚙️ Environment Setup & Installation

### A) Prerequisites
- **Node.js**: v18+
- **Freighter Wallet**: Installed as a browser extension

### B) Frontend Setup
1. **Clone & Navigate**:
   ```bash
   cd stellar-connect-wallet
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run development server**:
   ```bash
   npm start
   ```
4. **Access the portal**: Open [http://localhost:3000](http://localhost:3000) (Accept self-signed cert for HTTPS).

---

## 👨‍💻 Author
**Stellar Developer**
- Building the Sovereign Ledger
- [GitHub Repository](https://github.com/stellar-connect-wallet)
