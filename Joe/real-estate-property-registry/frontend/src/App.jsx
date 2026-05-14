import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PropertyRegistry from './contracts/PropertyRegistry.json';
import RegisterProperty from './components/RegisterProperty';
import PropertyList from './components/PropertyList';
import MyProperties from './components/MyProperties';
import AdminPanel from './components/AdminPanel';

// Contract address - update this after deployment
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default Hardhat local address

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [stats, setStats] = useState({ total: 0, mine: 0 });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();

        // For Hardhat local network, use JsonRpcProvider if MetaMask not available
        let finalProvider = provider;
        let finalSigner = signer;

        if (accounts.length === 0) {
          // Fallback for local testing without MetaMask
          finalProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
          finalSigner = await finalProvider.getSigner(0);
          setAccount(await finalSigner.getAddress());
        } else {
          setAccount(accounts[0]);
        }

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          PropertyRegistry.abi,
          finalSigner
        );

        setProvider(finalProvider);
        setContract(contract);

        // Check roles
        const adminAddress = await contract.admin();
        const verifierStatus = await contract.isVerifier(accounts[0] || await finalSigner.getAddress());

        setIsAdmin((accounts[0] || await finalSigner.getAddress()).toLowerCase() === adminAddress.toLowerCase());
        setIsVerifier(verifierStatus);

        showNotification('Wallet connected successfully!', 'success');
      } catch (error) {
        console.error("Connection error:", error);
        showNotification('Failed to connect wallet', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      showNotification('Please install MetaMask!', 'error');
    }
  };

  // Load stats
  const loadStats = async () => {
    if (!contract || !account) return;
    try {
      const total = await contract.getTotalProperties();
      const mine = await contract.getOwnerProperties(account);
      setStats({ total: Number(total), mine: mine.length });
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  // Notification helper
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (contract && account) {
      loadStats();
    }
  }, [contract, account]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
        window.location.reload();
      });
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🏠</div>
            <span>PropertyRegistry</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {account && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {account.slice(0, 6)}...{account.slice(-4)}
                {isAdmin && <span style={{ marginLeft: '8px', color: 'var(--warning)' }}>👑 Admin</span>}
                {isVerifier && !isAdmin && <span style={{ marginLeft: '8px', color: 'var(--secondary)' }}>✓ Verifier</span>}
              </span>
            )}
            <button 
              className={`wallet-btn ${account ? 'connected' : ''}`}
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? <span className="loading" style={{ marginRight: '8px' }}></span> : null}
              {account ? 'Connected' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Notification */}
        {notification && (
          <div className={`alert alert-${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* Stats */}
        {account && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Properties</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.mine}</div>
              <div className="stat-label">My Properties</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{isAdmin ? 'Yes' : isVerifier ? 'Yes' : 'No'}</div>
              <div className="stat-label">Special Access</div>
            </div>
          </div>
        )}

        {/* Not Connected State */}
        {!account && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏠</div>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Welcome to PropertyRegistry</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
              A decentralized platform for registering, verifying, and transferring real estate properties on the blockchain.
            </p>
            <button className="wallet-btn" onClick={connectWallet} disabled={loading}>
              {loading ? <span className="loading" style={{ marginRight: '8px' }}></span> : '🔗 '}
              Connect Wallet to Get Started
            </button>
          </div>
        )}

        {/* Main Content */}
        {account && (
          <>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'properties' ? 'active' : ''}`}
                onClick={() => setActiveTab('properties')}
              >
                📋 All Properties
              </button>
              <button 
                className={`tab ${activeTab === 'my-properties' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-properties')}
              >
                🏠 My Properties
              </button>
              <button 
                className={`tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                ➕ Register Property
              </button>
              {(isAdmin || isVerifier) && (
                <button 
                  className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  ⚙️ Admin Panel
                </button>
              )}
            </div>

            {activeTab === 'properties' && (
              <PropertyList 
                contract={contract} 
                account={account} 
                isVerifier={isVerifier}
                showNotification={showNotification}
                onUpdate={loadStats}
              />
            )}

            {activeTab === 'my-properties' && (
              <MyProperties 
                contract={contract} 
                account={account}
                showNotification={showNotification}
                onUpdate={loadStats}
              />
            )}

            {activeTab === 'register' && (
              <RegisterProperty 
                contract={contract}
                showNotification={showNotification}
                onUpdate={loadStats}
              />
            )}

            {(isAdmin || isVerifier) && activeTab === 'admin' && (
              <AdminPanel 
                contract={contract}
                isAdmin={isAdmin}
                account={account}
                showNotification={showNotification}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
