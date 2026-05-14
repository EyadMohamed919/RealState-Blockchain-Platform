import React, { useState } from 'react';
import { ethers } from 'ethers';

function RegisterProperty({ contract, showNotification, onUpdate }) {
  const [formData, setFormData] = useState({
    propertyAddress: '',
    description: '',
    area: '',
    documentHash: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setLoading(true);

      // Generate document hash if not provided
      const docHash = formData.documentHash || 
        ethers.keccak256(ethers.toUtf8Bytes(`doc-${Date.now()}-${formData.propertyAddress}`));

      const tx = await contract.registerProperty(
        formData.propertyAddress,
        formData.description,
        parseInt(formData.area),
        docHash
      );

      await tx.wait();

      showNotification('Property registered successfully! Awaiting verification.', 'success');
      setFormData({ propertyAddress: '', description: '', area: '', documentHash: '' });
      onUpdate();
    } catch (error) {
      console.error("Registration error:", error);
      showNotification(error.reason || 'Failed to register property', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="card">
      <div className="card-title">➕ Register New Property</div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Property Address *</label>
          <input
            className="form-input"
            name="propertyAddress"
            value={formData.propertyAddress}
            onChange={handleChange}
            placeholder="123 Blockchain Ave, Crypto City"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <input
            className="form-input"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Modern 3-bedroom apartment..."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Area (sq ft) *</label>
          <input
            className="form-input"
            name="area"
            type="number"
            value={formData.area}
            onChange={handleChange}
            placeholder="1500"
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Document Hash (optional)</label>
          <input
            className="form-input"
            name="documentHash"
            value={formData.documentHash}
            onChange={handleChange}
            placeholder="Auto-generated if left empty"
          />
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
            Leave empty to auto-generate from property data
          </small>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? <span className="loading" style={{ marginRight: '8px' }}></span> : '📝 '}
          Register Property
        </button>
      </form>
    </div>
  );
}

export default RegisterProperty;
