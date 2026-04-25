import React, { createContext, useState, useContext, useCallback } from 'react';
import { connectKitWallet, getBalance } from '../components/Freighter';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState('');
  const [balance, setBalance] = useState('0');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    if (connected || connecting) return;
    setConnecting(true);
    try {
      const key = await connectKitWallet();
      const bal = await getBalance();
      setPublicKey(key);
      setBalance(Number(bal).toFixed(2));
      setConnected(true);
    } catch (e) {
      console.error('[WalletKit] connect error:', e);
      // alert('Error connecting to wallet: ' + e.message); // removed alert to avoid blocking UI unnecessarily 
    } finally {
      setConnecting(false);
    }
  }, [connected, connecting]);

  const disconnectWallet = useCallback(() => {
    setPublicKey('');
    setBalance('0');
    setConnected(false);
  }, []);

  const shortKey = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : '';

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        balance,
        connected,
        connecting,
        connectWallet,
        disconnectWallet,
        shortKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
