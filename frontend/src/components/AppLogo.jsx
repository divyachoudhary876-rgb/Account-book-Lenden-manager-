// frontend/src/components/AppLogo.jsx

import React from 'react';

export default function AppLogo({ width = 40, height = 40, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Dynamic Geometric Enterprise Logo Icon */}
      <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="url(#brand_gradient)" />
        {/* Ledger Lines & Shield Geometric Balance */}
        <path d="M28 32H72M28 46H72M28 60H52" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <path d="M62 55L72 65L86 48" stroke="#10B981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="brand_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F172A" />
            <stop offset="1" stopColor="#1E293B" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px', lineHeight: '1.1' }}>
            Account Book
          </span>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Smart Lenden Manager
          </span>
        </div>
      )}
    </div>
  );
}
