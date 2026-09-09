import React from 'react';

/**
 * MarketMindLogo - Indian Retail & Small Business Sales AI Emblem
 * Combines an Indian Dukaan/Storefront arch, Indian Rupee (₹) symbol,
 * and an upward growth momentum wave in rich saffron gold & royal indigo.
 */
export const MarketMindLogo = ({
  size = 36,
  className = '',
  showText = false,
  textClassName = '',
  subtitle = 'Vyapar AI'
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="mmBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="50%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="mmGoldSaffron" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          <linearGradient id="mmIndigoCyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <linearGradient id="mmEmeraldGrowth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id="mmGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle Badge Container */}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="12"
          fill="url(#mmBgGrad)"
          stroke="#4338CA"
          strokeWidth="1.5"
        />

        {/* Indian Dukaan / Storefront Canopy (Awning scalloped arch) */}
        <path
          d="M10 15.5 C10 12.5, 14 10, 24 10 C34 10, 38 12.5, 38 15.5 L38 18.5 C36.5 19.8, 34 19.8, 32.5 18.5 C31 19.8, 28.5 19.8, 27 18.5 C25.5 19.8, 22.5 19.8, 21 18.5 C19.5 19.8, 17 19.8, 15.5 18.5 C14 19.8, 11.5 19.8, 10 18.5 Z"
          fill="url(#mmGoldSaffron)"
        />

        {/* Awning stripe accents */}
        <path
          d="M15.5 10.5 L15.5 18.5 M21 10.2 L21 18.5 M27 10.2 L27 18.5 M32.5 10.5 L32.5 18.5"
          stroke="#78350F"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Indian Rupee (₹) + Growth Momentum Arrow Central Iconography */}
        {/* Upper Rupee Top Bar */}
        <path
          d="M16 22 H32"
          stroke="url(#mmIndigoCyan)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Middle Rupee Bar */}
        <path
          d="M16 26.5 H28"
          stroke="url(#mmIndigoCyan)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Rupee Head Loop & Downward Shank */}
        <path
          d="M21 22 V30 C21 33, 27 33, 27 30 C27 27.5, 23 27, 21 27"
          stroke="url(#mmIndigoCyan)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Diagonal Ascending Vyapar Growth Beam (Rising upward to the right with arrow) */}
        <path
          d="M20 30 L31 39"
          stroke="url(#mmGoldSaffron)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Growth Spark / Shubh Diya Flame Apex */}
        <circle cx="34" cy="14" r="2.2" fill="#FDE047" filter="url(#mmGlow)" />
        <path
          d="M34 11.5 C34.5 12.8, 35.8 13.5, 35.8 14.5 C35.8 15.5, 35 16.2, 34 16.2 C33 16.2, 32.2 15.5, 32.2 14.5 C32.2 13.5, 33.5 12.8, 34 11.5 Z"
          fill="#F59E0B"
        />

        {/* Emerald Profit Indicator Dot */}
        <circle cx="37" cy="37" r="2.2" fill="url(#mmEmeraldGrowth)" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-white tracking-tight text-base">
              Market<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-indigo-300">Mind</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              AI
            </span>
          </div>
          {subtitle && (
            <span className={`text-[10px] font-semibold text-indigo-300/80 tracking-wider uppercase mt-0.5 ${textClassName}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketMindLogo;
