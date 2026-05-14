import React, { useState, useEffect } from 'react';

function AdminPanel({ contract, isAdmin, account, showNotification }) {
  const [verifierAddress, setVerifierAddress] = useState('');
  const [disputedPropertyId, setDisputedPropertyId] = useState('');
  const [contractBalance, setContractBalance] = useState('0');
  const [pendingProperties, setPendingProperties] = useState([]);

  const loadPendingProperties = async () => {
    if (!contract) return;
    try {
      const total = await contract.getTotalProperties();
      const pending = [];

      for (let i = 1; i <= total; i++) {
        try {
          const property = await contract.getProperty(i);
          if (property.exists && Number(property.status) === 0) {
            pending.push({
              id: Number(property.id),
              owner: property.owner,
              propertyAddress: property.propertyAddress,
              description: property.description
            });
          }
        } catch (e) {}
      }

      setPendingProperties(pending);
    } catch (error) {
      console.error("Load error:", error);
    }
  };

  const loadBalance = async () => {
    if (!contract) return;
    try {
      const balance = await contract.getContractBalance();
      setContractBalance(balance.toString());
    } catch (error) {
      console.error("Balance error:", error);
    }
  };

  const addVerifier = async () => {
    if (!verifierAddress) return;
    try {
      const tx = await contract.addVerifier(verifierAddress);
      await tx.wait();
      showNotification('Verifier added successfully!', 'success');
      setVerifierAddress('');
    } catch (error) {
      showNotification(error.reason || 'Failed to add verifier', 'error');
    }
  };

  const removeVerifier = async () => {
    if (!verifierAddress) return;
    try {
      const tx = await contract.removeVerifier(verifierAddress);
      await tx.wait();
      showNotification('Verifier removed successfully!', 'success');
      setVerifierAddress('');
    } catch (error) {
      showNotification(error.reason || 'Failed to remove verifier', 'error');
    }
  };

  const verifyProperty = async (propertyId) => {
    try {
      const tx = await contract.verifyProperty(propertyId);
      await tx.wait();
      showNotification('Property verified!', 'success');
      loadPendingProperties();
    } catch (error) {
      showNotification(error.reason || 'Verification failed', 'error');
    }
  };

  const markDisputed = async (disputed) => {
    if (!disputedPropertyId) return;
    try {
      const tx = await contract.markDisputed(disputedPropertyId, disputed);
      await tx.wait();
      showNotification(`Property marked as ${disputed ? 'disputed' : 'resolved'}!`, 'success');
      setDisputedPropertyId('');
    } catch (error) {
      showNotification(error.reason || 'Operation failed', 'error');
    }
  };

  const withdrawFunds = async () => {
    try {
      const tx = await contract.withdraw();
      await tx.wait();
      showNotification('Funds withdrawn successfully!', 'success');
      loadBalance();
    } catch (error) {
      showNotification(error.reason || 'Withdrawal failed', 'error');
    }
  };

  useEffect(() => {
    loadPendingProperties();
    loadBalance();
  }, [contract]);

  return (
    <div>
      <div className="card">
        <div className="card-title">⚙️ Admin Panel</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-value">{pendingProperties.length}</div>
            <div className="stat-label">Pending Verifications</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{contractBalance}</div>
            <div className="stat-label">Contract Balance (wei)</div>
          </div>
        </div>
      </div>

      {/* Pending Verifications */}
      <div className="card">
        <div className="card-title">⏳ Pending Verifications</div>
        {pendingProperties.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No pending properties to verify.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingProperties.map((property) => (
              <div 
                key={property.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--bg-input)',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>#{property.id} - {property.propertyAddress}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {property.description} | Owner: {property.owner.slice(0, 6)}...{property.owner.slice(-4)}
                  </div>
                </div>
                <button 
                  className="btn btn-success"
                  onClick={() => verifyProperty(property.id)}
                >
                  ✓ Verify
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verifier Management */}
      {isAdmin && (
        <div className="card">
          <div className="card-title">👥 Verifier Management</div>
          <div className="form-group">
            <label className="form-label">Verifier Address</label>
            <input
              className="form-input"
              placeholder="0x..."
              value={verifierAddress}
              onChange={(e) => setVerifierAddress(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-success" onClick={addVerifier}>
              ➕ Add Verifier
            </button>
            <button className="btn btn-danger" onClick={removeVerifier}>
              ➖ Remove Verifier
            </button>
          </div>
        </div>
      )}

      {/* Dispute Management */}
      {isAdmin && (
        <div className="card">
          <div className="card-title">⚠️ Dispute Management</div>
          <div className="form-group">
            <label className="form-label">Property ID</label>
            <input
              className="form-input"
              type="number"
              placeholder="Enter property ID"
              value={disputedPropertyId}
              onChange={(e) => setDisputedPropertyId(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-danger" onClick={() => markDisputed(true)}>
              🚩 Mark Disputed
            </button>
            <button className="btn btn-success" onClick={() => markDisputed(false)}>
              ✓ Resolve Dispute
            </button>
          </div>
        </div>
      )}

      {/* Contract Funds */}
      {isAdmin && (
        <div className="card">
          <div className="card-title">💰 Contract Funds</div>
          <p style={{ marginBottom: '16px' }}>
            Balance: <strong>{contractBalance} wei</strong>
          </p>
          <button className="btn btn-primary" onClick={withdrawFunds}>
            💸 Withdraw Funds
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
