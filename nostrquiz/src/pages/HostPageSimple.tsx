import React from 'react';

const HostPageSimple: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0E0F19', 
      color: '#FFFFFF',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Host Page - Simple Version</h1>
      <p>This is a simple version of the host page without hooks</p>
      <button style={{
        background: '#5B2DEE',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
      }}>
        Test Button
      </button>
    </div>
  );
};

export default HostPageSimple;