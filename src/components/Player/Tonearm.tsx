import React from 'react';
import { formatDuration } from '../../utils/formatters';
import { calculateTonearmAngle } from '../../utils/tonearmMath';
import './Tonearm.css';

export { calculateTonearmAngle } from '../../utils/tonearmMath';

export interface TonearmProps {
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Tonearm: React.FC<TonearmProps> = ({
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  className = '',
  style,
}) => {
  const angle = calculateTonearmAngle(currentTime, duration, isPlaying);
  const timeLabel = isPlaying && duration > 0 ? `${formatDuration(currentTime)} / ${formatDuration(duration)}` : 'Parked';

  return (
    <div
      className={`tonearm-assembly ${className}`}
      aria-hidden="true"
      title={`Tonearm (${timeLabel})`}
      style={style}
      data-testid="tonearm-component"
      data-playing={isPlaying ? 'true' : 'false'}
    >
      <svg
        viewBox="0 0 180 420"
        className="tonearm-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="tonearm-shadow" x="-30%" y="-20%" width="160%" height="150%">
            <feDropShadow dx="6" dy="12" stdDeviation="8" floodColor="#000000" floodOpacity="0.65" />
          </filter>
          <linearGradient id="tonearm-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--line-strong)" />
            <stop offset="35%" stopColor="var(--ink-secondary)" />
            <stop offset="85%" stopColor="var(--ink-tertiary)" />
            <stop offset="100%" stopColor="var(--surface-active)" />
          </linearGradient>
        </defs>

        {/* 5. Stationary Cueing Rest Post at parked position (around x=95, y=140) */}
        <g className="tonearm-cueing-rest">
          <rect x="96" y="130" width="10" height="24" rx="2" fill="var(--surface-active)" stroke="var(--line-strong)" strokeWidth="1" />
          <circle cx="101" cy="130" r="3" fill="var(--surface-panel)" />
        </g>

        {/* Rotatable Arm Assembly pivoted at (70, 70) */}
        <g
          className="tonearm-rotating-group"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '70px 70px',
          }}
          filter="url(#tonearm-shadow)"
        >
          {/* 2. Counterweight: filled cylinder (22x16px) on opposite side of pivot */}
          <rect
            x="59"
            y="14"
            width="22"
            height="18"
            rx="3"
            fill="var(--surface-active)"
            stroke="var(--line-strong)"
            strokeWidth="1.5"
          />
          <line x1="59" y1="20" x2="81" y2="20" stroke="var(--line-subtle)" strokeWidth="1" />
          <line x1="59" y1="26" x2="81" y2="26" stroke="var(--line-subtle)" strokeWidth="1" />

          {/* Counterweight shaft */}
          <rect x="67" y="32" width="6" height="20" fill="var(--surface-hover)" />

          {/* 3. Arm Beam: Gentle S-Curve (two opposing arcs), tapered 7px to 5px */}
          {/* Tube bottom shadow line for roundness */}
          <path
            d="M 70 70 C 70 160 52 230 68 320"
            stroke="var(--surface-base)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          {/* Main S-beam stroke */}
          <path
            d="M 70 70 C 70 160 52 230 68 320"
            stroke="url(#tonearm-beam-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Top highlight for tube roundness */}
          <path
            d="M 69 72 C 69 160 51 230 67 318"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* 4. Headshell: angled trapezoid set ~22° off beam axis */}
          <g transform="translate(68, 320) rotate(22)">
            {/* Trapezoid shell */}
            <polygon
              points="-8,0 8,2 5,36 -6,34"
              fill="var(--surface-panel)"
              stroke="var(--line-strong)"
              strokeWidth="1.5"
            />
            {/* Finger lift hook */}
            <path
              d="M -6 16 C -18 14 -16 4 -10 2"
              stroke="var(--ink-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cartridge body */}
            <rect
              x="-4"
              y="26"
              width="8"
              height="12"
              rx="1.5"
              fill="var(--surface-hover)"
              stroke="var(--line-subtle)"
              strokeWidth="1"
            />
            {/* 3px Stylus Tip touching groove */}
            <circle
              cx="0"
              cy="40"
              r="3"
              fill={isPlaying ? 'var(--accent-bright)' : 'var(--ink-disabled)'}
            />
          </g>
        </g>

        {/* 1. Stationary Pivot Assembly Anchored at (70, 70) */}
        {/* Rectangular bearing housing offset behind */}
        <rect
          x="54"
          y="48"
          width="32"
          height="44"
          rx="4"
          fill="var(--surface-panel)"
          stroke="var(--line-strong)"
          strokeWidth="1.5"
        />
        {/* Outer Ring: 34px diameter (r=17) */}
        <circle
          cx="70"
          cy="70"
          r="17"
          fill="var(--surface-panel)"
          stroke="var(--line-strong)"
          strokeWidth="1.5"
        />
        {/* Inner Hub: 18px diameter (r=9) */}
        <circle
          cx="70"
          cy="70"
          r="9"
          fill="var(--surface-raised)"
          stroke="var(--accent-deep)"
          strokeWidth="1.5"
        />
        {/* Upper-left 1px highlight on the hub */}
        <path
          d="M 63 66 A 9 9 0 0 1 74 61"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.2"
          fill="none"
        />
        {/* Center pivot screw */}
        <circle
          cx="70"
          cy="70"
          r="4"
          fill="var(--surface-base)"
          stroke="var(--line-subtle)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

export default Tonearm;
