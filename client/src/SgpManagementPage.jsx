import React from 'react';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 40,
  marginBottom: 30,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
  textAlign: 'center',
};

export default function SgpManagementPage() {
  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>СГП Management</h1>
      
      <div style={cardStyle}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>🚧</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>
          В разработке
        </h2>
        <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>
          Этот раздел находится в разработке. Пожалуйста, зайдите позже.
        </p>
      </div>
    </div>
  );
}