import React from 'react';

export const CapybaraSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <rect x="10" y="20" width="80" height="50" rx="20" fill="#a0724e" />
    {/* Head */}
    <rect x="50" y="10" width="45" height="40" rx="15" fill="#a0724e" />
    {/* Snout */}
    <rect x="80" y="25" width="15" height="20" rx="5" fill="#5d4037" />
    {/* Eye */}
    <circle cx="70" cy="25" r="3" fill="#3e2723" />
    {/* Ear */}
    <circle cx="60" cy="12" r="5" fill="#5d4037" />
    {/* Legs */}
    <rect x="20" y="65" width="10" height="15" rx="5" fill="#5d4037" />
    <rect x="70" y="65" width="10" height="15" rx="5" fill="#5d4037" />
  </svg>
);

export const YuzuSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" className="fill-yellow-400 stroke-orange-500" />
    <path d="M12 2v2" className="stroke-green-600" />
    <path d="M12 22v-2" className="stroke-orange-500 opacity-20" />
    <circle cx="9" cy="10" r="1" className="fill-orange-600 stroke-none opacity-40" />
    <circle cx="15" cy="14" r="1" className="fill-orange-600 stroke-none opacity-40" />
  </svg>
);

export const CatSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" className="fill-white stroke-slate-600"/>
     <path d="M8 14v.5" className="stroke-slate-600"/>
     <path d="M16 14v.5" className="stroke-slate-600"/>
     <path d="M11.25 16.25h1.5" className="stroke-slate-600"/>
  </svg>
);

export const CloudSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" className="fill-slate-200 stroke-slate-400"/>
    <path d="M8 19v2" className="stroke-blue-400"/>
    <path d="M12 19v2" className="stroke-blue-400"/>
    <path d="M16 19v2" className="stroke-blue-400"/>
  </svg>
);
