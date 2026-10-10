import { SortOption } from '../components/Library/SortMenu';
import { Track } from '../types';

export const sortSongs = (tracks: Track[], sort: SortOption): Track[] => {
  return [...tracks].sort((a, b) => {
    switch (sort) {
      case 'title-asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

      case 'title-desc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });

      case 'date-desc':
        return (parseInt(b.date_added, 10) || 0) - (parseInt(a.date_added, 10) || 0);

      case 'date-asc':
        return (parseInt(a.date_added, 10) || 0) - (parseInt(b.date_added, 10) || 0);

      default:
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
  });
};
