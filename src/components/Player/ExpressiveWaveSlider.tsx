import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatDuration } from '../../utils/formatters';
import './ExpressiveWaveSlider.css';

interface ExpressiveWaveSliderProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  disabled?: boolean;
}

export const ExpressiveWaveSlider: React.FC<ExpressiveWaveSliderProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const playedPathRef = useRef<SVGPathElement>(null);
  const unplayedPathRef = useRef<SVGPathElement>(null);
  const thumbRef = useRef<SVGCircleElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // Animation and layout refs
  const phaseRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const widthRef = useRef<number>(500);

  // Derive current effective time and progress ratio
  const effectiveTime = isScrubbing ? scrubTime : currentTime;
  const clampedTime = duration > 0 ? Math.min(duration, Math.max(0, effectiveTime)) : 0;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, clampedTime / duration)) : 0;

  // Measure container dimensions
  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        widthRef.current = rect.width;
        if (svgRef.current) {
          svgRef.current.setAttribute('viewBox', `0 0 ${rect.width} 24`);
        }
      }
    }
  }, []);

  // Construct SVG Wave path string
  const generateWavePath = useCallback((width: number, ratio: number, phase: number, active: boolean, hovered: boolean) => {
    const height = 24;
    const centerY = height / 2;
    const progressX = Math.min(width, Math.max(0, width * ratio));

    // Amplitude is boosted ~20% on hover (4.0 -> 4.8)
    const baseAmp = hovered ? 4.8 : 4.0;
    const amplitude = active ? baseAmp : 3.0;

    if (progressX <= 0) {
      return {
        playedD: `M 0,${centerY} L 0,${centerY}`,
        unplayedD: `M 0,${centerY} L ${width},${centerY}`,
        thumbX: 0,
        thumbY: centerY,
      };
    }

    if (progressX >= width) {
      const wavelength = 30;
      let d = `M 0,${centerY}`;

      for (let x = 2; x <= width; x += 2) {
        const taperStart = Math.min(1, x / 16);
        const taperEnd = Math.min(1, (width - x) / 16);
        const taper = Math.max(0, Math.min(taperStart, taperEnd));
        const y = centerY + amplitude * taper * Math.sin((x / wavelength) * Math.PI * 2 - phase);
        d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
      }

      return {
        playedD: d,
        unplayedD: `M ${width},${centerY} L ${width},${centerY}`,
        thumbX: width,
        thumbY: centerY,
      };
    }

    // Standard: Played is wavy, unplayed is flat (needle has cut the groove)
    const wavelength = 30;
    let playedD = `M 0,${centerY}`;

    const step = 2;
    for (let x = step; x <= progressX; x += step) {
      const taperStart = Math.min(1, x / 16);
      const taperEnd = Math.min(1, (progressX - x) / 16);
      const taper = Math.max(0, Math.min(taperStart, taperEnd));
      const y = centerY + amplitude * taper * Math.sin((x / wavelength) * Math.PI * 2 - phase);
      playedD += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
    }
    // Connect precisely to progressX on mean baseline
    playedD += ` L ${progressX.toFixed(1)},${centerY}`;

    const unplayedD = `M ${progressX.toFixed(1)},${centerY} L ${width.toFixed(1)},${centerY}`;

    return {
      playedD,
      unplayedD,
      thumbX: progressX,
      thumbY: centerY, // Always pinned to mean line
    };
  }, []);

  // Update DOM directly for max 60/120fps performance
  const renderWaveToDOM = useCallback((phase: number) => {
    const width = widthRef.current || 500;
    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', `0 0 ${width} 24`);
    }
    const { playedD, unplayedD, thumbX, thumbY } = generateWavePath(
      width,
      progressRatio,
      phase,
      isPlaying && !isScrubbing,
      isHovered
    );

    if (playedPathRef.current) {
      playedPathRef.current.setAttribute('d', playedD);
    }
    if (unplayedPathRef.current) {
      unplayedPathRef.current.setAttribute('d', unplayedD);
    }
    if (thumbRef.current) {
      thumbRef.current.setAttribute('cx', thumbX.toFixed(1));
      thumbRef.current.setAttribute('cy', thumbY.toFixed(1));
    }
  }, [progressRatio, isPlaying, isScrubbing, isHovered, generateWavePath]);

  useEffect(() => {
    updateWidth();
    if (!containerRef.current) return;

    const el = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateWidth();
        renderWaveToDOM(phaseRef.current);
      });
      ro.observe(el);
    }

    const handleResize = () => {
      updateWidth();
      renderWaveToDOM(phaseRef.current);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateWidth, renderWaveToDOM]);

  // Animation loop with requestAnimationFrame
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isPlaying || isScrubbing || prefersReducedMotion) {
      renderWaveToDOM(phaseRef.current);
      return;
    }

    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;
      phaseRef.current += 0.055;
      if (phaseRef.current > Math.PI * 2000) {
        phaseRef.current = 0;
      }
      renderWaveToDOM(phaseRef.current);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, isScrubbing, isHovered, renderWaveToDOM]);

  // Trigger DOM update on progress/ratio or hover change
  useEffect(() => {
    renderWaveToDOM(phaseRef.current);
  }, [progressRatio, isHovered, renderWaveToDOM]);

  // Pointer scrubbing handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0 || !containerRef.current) return;

    updateWidth();
    const calculateTime = (clientX: number) => {
      if (!containerRef.current) return 0;
      const currentRect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - currentRect.left) / (currentRect.width || 1)));
      return ratio * duration;
    };

    const newTime = calculateTime(e.clientX);
    setIsScrubbing(true);
    setScrubTime(newTime);

    const onPointerMove = (moveEv: PointerEvent) => {
      setScrubTime(calculateTime(moveEv.clientX));
    };

    const onPointerUp = (upEv: PointerEvent) => {
      const finalTime = calculateTime(upEv.clientX);
      onSeek(finalTime);
      setIsScrubbing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = rect.width > 0 ? x / rect.width : 0;
    setHoverX(x);
    setHoverTime(ratio * duration);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverTime(null);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSeek(duration);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`m3-expressive-wave-slider ${isScrubbing ? 'scrubbing' : ''} ${isHovered ? 'hovered' : ''} ${disabled ? 'disabled' : ''}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Playback Position"
      aria-valuenow={Math.round(clampedTime)}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Time hover tooltip */}
      {isHovered && hoverTime !== null && !disabled && (
        <div
          className="wave-slider-tooltip"
          style={{ left: `${hoverX}px` }}
          aria-hidden="true"
        >
          {formatDuration(hoverTime)}
        </div>
      )}

      <svg
        ref={svgRef}
        className="wave-slider-svg"
        viewBox={`0 0 ${widthRef.current || 500} 24`}
        preserveAspectRatio="none"
      >
        {/* Unplayed straight track */}
        <path
          ref={unplayedPathRef}
          className="wave-unplayed-track"
          d={`M 0,12 L ${widthRef.current || 500},12`}
          vectorEffect="non-scaling-stroke"
        />

        {/* Played animated sine wave */}
        <path
          ref={playedPathRef}
          className="wave-played-track"
          d={`M 0,12 L 0,12`}
          vectorEffect="non-scaling-stroke"
        />

        {/* Playhead thumb pinned to mean line */}
        <circle
          ref={thumbRef}
          className="wave-thumb"
          cx="0"
          cy="12"
          r={isHovered || isScrubbing ? 6.5 : 5}
        />
      </svg>
    </div>
  );
};

export default ExpressiveWaveSlider;
