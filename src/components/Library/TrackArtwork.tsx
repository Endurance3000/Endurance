import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { libraryService } from '../../services/library/libraryService';
import './TrackArtwork.css';

interface TrackArtworkProps {
  artworkHash?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  artworkHash,
  alt,
  size = 'sm',
  className = '',
}) => {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
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
  }, [artworkHash]);

  return (
    <div className={`track-artwork-thumb track-artwork-${size} ${className}`}>
      {dataUri ? (
        <img src={dataUri} alt={alt} className="track-artwork-img" loading="lazy" />
      ) : (
        <Music size={size === 'lg' ? 32 : size === 'md' ? 24 : 16} className="track-artwork-fallback" />
      )}
    </div>
  );
};
