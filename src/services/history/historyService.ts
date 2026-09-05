import { invoke } from '@tauri-apps/api/core';
import { HistoryItem } from '../../types';

type HistoryListener = (items: HistoryItem[]) => void;

class HistoryService {
  private listeners: Set<HistoryListener> = new Set();
  private cachedHistory: HistoryItem[] = [];

  async recordHistory(trackId: string, durationPlayed: number, completed: boolean): Promise<void> {
    try {
      await invoke('record_playback_history', {
        trackId,
        durationPlayed,
        completed,
      });

      // Refresh cached history and notify listeners
      await this.getHistory(30);
    } catch (err) {
      console.warn('Failed to record playback history:', err);
    }
  }

  async getHistory(limit: number = 30): Promise<HistoryItem[]> {
    try {
      const items = await invoke<HistoryItem[]>('get_playback_history', { limit });
      this.cachedHistory = items || [];
      this.notifyListeners();
      return this.cachedHistory;
    } catch (err) {
      console.warn('Failed to fetch playback history:', err);
      return this.cachedHistory;
    }
  }

  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    if (this.cachedHistory.length > 0) {
      listener(this.cachedHistory);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.cachedHistory);
    }
  }
}

export const historyService = new HistoryService();
