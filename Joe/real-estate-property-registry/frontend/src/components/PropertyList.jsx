import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function PropertyList({ contract, account, isVerifier, showNotification, onUpdate }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState({});

  const loadProperties = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const total = await contract.getTotalProperties();
      const props = [];

      for (let i = 1; i <= total; i++) {
        try {
          const property = await contract.getProperty(i);
          if (property.exists) {
            props.push({
              id: Number(property.id),
              owner: property.owner,
              propertyAddress: property.propertyAddress,
              description: property.description,
              area: Number(property.area),
              price: property.price,
              status: Number(property.status),
              registrationDate: Number(property.registrationDate)
            });
          }
        } catch (e) {
          // Skip non-existent properties
        }
      }

      setProperties(props.reverse());
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifyProperty = async (propertyId) => {
    try {
      const tx = await contract.verifyProperty(propertyId);
      await tx.wait();
      showNotification('Property verified successfully!', 'success');
      loadProperties();
      onUpdate();
    } catch (error) {
      showNotification(error.reason || 'Verification failed', 'error');
    }
  };

  const buyProperty = async (propertyId, price) => {
    try {
      setBuyLoading({ ...buyLoading, [propertyId]: true });
      const tx = await contract.buyProperty(propertyId, { value: price });
      await tx.wait();
      showNotification('Property purchased successfully!', 'success');
      loadProperties();
      onUpdate();
    } catch (error) {
      showNotification(error.reason || 'Purchase failed', 'error');
    } finally {
      setBuyLoading({ ...buyLoading, [propertyId]: false });
    }
  };

  const getStatusBadge = (status) => {
    const statuses = ['Pending', 'Verified', 'For Sale', 'Sold', 'Disputed'];
    const classes = ['badge-pending', 'badge-verified', 'badge-forsale', 'badge-sold', 'badge-disputed'];
    return <span className={`badge ${classes[status]}`}>{statuses[status]}</span>;
  };

  useEffect(() => {
    loadProperties();
  }, [contract]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading properties...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">📋 All Registered Properties</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
          Total: {properties.length} properties registered on the blockchain
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
              <span className="property-detail-label">Owner</span>
              <span className="property-detail-value">
                {property.owner.slice(0, 6)}...{property.owner.slice(-4)}
                {property.owner.toLowerCase() === account.toLowerCase() && ' (You)'}
              </span>
            </div>

            <div className="property-detail">
              <span className="property-detail-label">Registered</span>
              <span className="property-detail-value">
                {new Date(property.registrationDate * 1000).toLocaleDateString()}
              </span>
            </div>

            {property.price > 0 && (
              <div className="property-detail">
                <span className="property-detail-label">Price</span>
                <span className="property-detail-value" style={{ color: 'var(--secondary)', fontWeight: '700' }}>
                  {ethers.formatEther(property.price)} ETH
                </span>
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              {/* Verify button for verifiers */}
              {isVerifier && property.status === 0 && (
                <button 
                  className="btn btn-success"
                  onClick={() => verifyProperty(property.id)}
                  style={{ flex: 1 }}
                >
                  ✓ Verify
                </button>
              )}

              {/* Buy button for For Sale properties */}
              {property.status === 2 && property.owner.toLowerCase() !== account.toLowerCase() && (
                <button 
                  className="btn btn-primary"
                  onClick={() => buyProperty(property.id, property.price)}
                  disabled={buyLoading[property.id]}
                  style={{ flex: 1 }}
                >
                  {buyLoading[property.id] ? <span className="loading" style={{ marginRight: '8px' }}></span> : '💰 '}
                  Buy for {ethers.formatEther(property.price)} ETH
                </button>
              )}

              {property.status !== 2 && property.status !== 0 && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '8px' }}>
                  Not available for purchase
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No properties registered yet.</p>
        </div>
      )}
    </div>
  );
}

export default PropertyList;
