/**
 * Presence Service — interface for Discord RPC / platform presence.
 *
 * WEB: Discord RPC is NOT available in browsers.
 * This service provides a no-op implementation for web.
 * The Desktop (Electron) app can implement the full version.
 *
 * See docs/WEB_LIMITATIONS.md for details.
 */

import type { Track } from '../types';

export interface PresenceActivity {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
}

export interface PresenceService {
  setActivity: (activity: PresenceActivity) => Promise<void>;
  clearActivity: () => Promise<void>;
  isAvailable: () => boolean;
}

// Web no-op implementation
export const webPresenceService: PresenceService = {
  setActivity: async () => {
    // No-op: Discord RPC not available in browser
  },
  clearActivity: async () => {
    // No-op
  },
  isAvailable: () => false,
};
