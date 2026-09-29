// frontend/src/components/AppLogo.jsx

import React from 'react';

export default function AppLogo({ width = 42, height = 42, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Modern Professional Enterprise Logo Icon */}
      <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="24" fill="url(#professional_gradient)" />
        
        {/* Subtle Background Glow Accent */}
        <circle cx="50" cy="50" r="35" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="4" />

        {/* Financial Ledger & Balance Lines */}
        <path d="M30 34H70" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <path d="M30 50H58" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
        <path d="M30 66H46" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />

        {/* Dynamic Success Verification Badge */}
        <circle cx="70" cy="66" r="14" fill="#0F172A" />
        <path d="M63 66L68 71L78 59" stroke="#10B981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

        <defs>
          <linearGradient id="professional_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B0F19" />
            <stop offset="0.5" stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.6px', lineHeight: '1.1' }}>
            Account Book
          </span>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Enterprise Manager
          </span>
        </div>
      )}
    </div>
  );
}
