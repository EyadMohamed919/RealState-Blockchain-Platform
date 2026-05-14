import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function MyProperties({ contract, account, showNotification, onUpdate }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listPrice, setListPrice] = useState('');
  const [listingId, setListingId] = useState(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferId, setTransferId] = useState(null);

  const loadMyProperties = async () => {
    if (!contract || !account) return;
    try {
      setLoading(true);
      const propertyIds = await contract.getOwnerProperties(account);
      const props = [];

      for (const id of propertyIds) {
        const property = await contract.getProperty(id);
        props.push({
          id: Number(property.id),
          propertyAddress: property.propertyAddress,
          description: property.description,
          area: Number(property.area),
          price: property.price,
          status: Number(property.status),
          registrationDate: Number(property.registrationDate)
        });
      }

      setProperties(props);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const listForSale = async (propertyId) => {
    if (!listPrice) return;
    try {
      const price = ethers.parseEther(listPrice);
      const tx = await contract.listForSale(propertyId, price);
      await tx.wait();
      showNotification('Property listed for sale!', 'success');
      setListingId(null);
      setListPrice('');
      loadMyProperties();
      onUpdate();
    } catch (error) {
      showNotification(error.reason || 'Failed to list property', 'error');
    }
  };

  const transferProperty = async (propertyId) => {
    if (!transferAddress || !ethers.isAddress(transferAddress)) {
      showNotification('Invalid address', 'error');
      return;
    }
    try {
      const tx = await contract.transferProperty(propertyId, transferAddress);
      await tx.wait();
      showNotification('Property transferred successfully!', 'success');
      setTransferId(null);
      setTransferAddress('');
      loadMyProperties();
      onUpdate();
    } catch (error) {
      showNotification(error.reason || 'Transfer failed', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statuses = ['Pending', 'Verified', 'For Sale', 'Sold', 'Disputed'];
    const classes = ['badge-pending', 'badge-verified', 'badge-forsale', 'badge-sold', 'badge-disputed'];
    return <span className={`badge ${classes[status]}`}>{statuses[status]}</span>;
  };

  useEffect(() => {
    loadMyProperties();
  }, [contract, account]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">🏠 My Properties</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          You own {properties.length} property{properties.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      <div className="property-grid">
        {properties.map((property) => (
          <div key={property.id} className="property-card">
            <div className="property-header">
              <span className="property-id">#{property.id}</span>
              {getStatusBadge(property.status)}
            </div>

            <div className="property-address">{property.propertyAddress}</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
              {property.description}
            </p>

            <div className="property-detail">
              <span className="property-detail-label">Area</span>
              <span className="property-detail-value">{property.area.toLocaleString()} sq ft</span>
            </div>

            <div className="property-detail">
              <span className="property-detail-label">Registered</span>
              <span className="property-detail-value">
                {new Date(property.registrationDate * 1000).toLocaleDateString()}
              </span>
            </div>

            {property.price > 0 && (
              <div className="property-detail">
                <span className="property-detail-label">Listed Price</span>
                <span className="property-detail-value" style={{ color: 'var(--secondary)' }}>
                  {ethers.formatEther(property.price)} ETH
                </span>
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* List for sale */}
              {(property.status === 1 || property.status === 3) && (
                <>
                  {listingId === property.id ? (
                    <div style={{ width: '100%' }}>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        placeholder="Price in ETH"
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        style={{ marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-success"
                          onClick={() => listForSale(property.id)}
                          style={{ flex: 1 }}
                        >
                          ✓ Confirm
                        </button>
                        <button 
                          className="btn btn-outline"
                          onClick={() => { setListingId(null); setListPrice(''); }}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-primary"
                      onClick={() => setListingId(property.id)}
                    >
                      🏷️ List for Sale
                    </button>
                  )}
                </>
              )}

              {/* Transfer */}
              {property.status !== 0 && (
                <>
                  {transferId === property.id ? (
                    <div style={{ width: '100%' }}>
                      <input
                        className="form-input"
                        placeholder="Recipient address (0x...)"
                        value={transferAddress}
                        onChange={(e) => setTransferAddress(e.target.value)}
                        style={{ marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-success"
                          onClick={() => transferProperty(property.id)}
                          style={{ flex: 1 }}
                        >
                          ✓ Transfer
                        </button>
                        <button 
                          className="btn btn-outline"
                          onClick={() => { setTransferId(null); setTransferAddress(''); }}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline"
                      onClick={() => setTransferId(property.id)}
                    >
                      📤 Transfer
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You don't own any properties yet.</p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '16px' }}
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'register' }))}
          >
            Register Your First Property
          </button>
        </div>
      )}
    </div>
  );
}

export default MyProperties;
