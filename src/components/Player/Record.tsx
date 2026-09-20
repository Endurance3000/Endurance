import React, { useState, useEffect } from 'react';
import { libraryService } from '../../services/library/libraryService';
import './Record.css';

export interface RecordProps {
  isPlaying?: boolean;
  artworkHash?: string | null;
  artworkUrl?: string | null;
  album?: string;
  artist?: string;
  title?: string;
  labelColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Record: React.FC<RecordProps> = ({
  isPlaying = false,
  artworkHash,
  artworkUrl,
  labelColor,
  className = '',
  style,
}) => {
  const [dataUri, setDataUri] = useState<string | null>(artworkUrl || null);

  useEffect(() => {
    if (artworkUrl) {
      setDataUri(artworkUrl);
      return;
    }
    let isMounted = true;
    if (!artworkHash) {
      setDataUri(null);
      return;
    }

    libraryService.getTrackArtwork(artworkHash).then((uri) => {
      if (isMounted && uri) {
        setDataUri(uri);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [artworkHash, artworkUrl]);

  return (
    <div
      className={`record-container ${className}`}
      aria-hidden="true"
      style={style}
      data-testid="record-component"
    >
      {/* 10. Contact Shadow beneath the disc */}
      <div className="record-contact-shadow" />

      {/* 1. Rotating Disc Assembly (Body, Grooves, Land bands, Label) */}
      <div
        className="record-rotating-disc"
        data-playing={isPlaying ? 'true' : 'false'}
        data-testid="record-rotating-disc"
      >
        {/* 1. Rim Lip: 2 Concentric rings at 99% and 97% radius */}
        <div className="record-rim-lip-outer" />
        <div className="record-rim-lip-inner" />

        {/* 2, 3, 5. Lead-in (96-92%), Grooves (92-34%), Run-out (34-31%) */}
        <div className="record-disc-grooves" />

        {/* 4. Five Land Bands at 88%, 76%, 64%, 52%, 40% radius */}
        <div className="record-land-band band-88" />
        <div className="record-land-band band-76" />
        <div className="record-land-band band-64" />
        <div className="record-land-band band-52" />
        <div className="record-land-band band-40" />

        {/* 8. Dust and wear texture streaks */}
        <div className="record-dust-wear" />

        {/* 6. Center Label (30% diameter, circular artwork crop, no rotating text) */}
        <div
          className="record-center-label"
          style={{
            backgroundColor: labelColor || 'var(--surface-panel)',
          }}
        >
          {dataUri ? (
            <img
              src={dataUri}
              alt=""
              className="record-label-artwork"
              loading="lazy"
            />
          ) : (
            <div className="record-label-fallback-art" />
          )}
          <div className="record-label-grain" />
          <div className="record-label-ring" />

          {/* 7. Spindle hole (12px, bevel ring & inner shadow) */}
          <div className="record-spindle-hole" />
        </div>
      </div>

      {/* 9. Fixed Stationary Specular Sheen Highlight (DOES NOT ROTATE, 112deg, ~18% width) */}
      <div className="record-fixed-sheen" data-testid="record-fixed-sheen" />
    </div>
  );
};

export default Record;

