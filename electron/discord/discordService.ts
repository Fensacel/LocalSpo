/**
 * discordService.ts
 *
 * Manages the Discord Rich Presence IPC connection for LocalSpo.
 *
 * Responsibilities:
 *  - Initialize and connect the discord-rpc client
 *  - Auto-reconnect when Discord is closed / restarted
 *  - Update presence with full playback metadata
 *  - Clear presence on pause-stop / idle / disable
 *  - Shutdown cleanly on app quit
 *
 * Asset keys (upload in Discord Developer Portal → Rich Presence → Art Assets):
 *  - localspo_logo  (large image)
 *  - playing        (small image – playing state)
 *  - pause          (small image – paused state)
 *  - music          (small image – optional idle)
 */

import { Client } from '@xhayper/discord-rpc';

// ActivityType enum values for Discord RPC (0: Playing, 1: Streaming, 2: Listening, 3: Watching)
const ActivityType = {
  Playing: 0,
  Streaming: 1,
  Listening: 2,
  Watching: 3,
} as const;

// ─── Types ───────────────────────────────────────────────

export interface DiscordPresencePayload {
  title: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** 'offline' | 'streaming' | 'cache' */
  sourceType: 'offline' | 'streaming' | 'cache';
  /** YouTube videoId – only present for streaming tracks */
  ytVideoId?: string;
  /** Playlist / source name to show in State */
  sourceName?: string;
  /** Online HTTP/HTTPS cover image URL */
  coverUrl?: string;
  /** Currently active synced lyric line */
  lyricLine?: string;
}

// ─── Constants ───────────────────────────────────────────

const RECONNECT_INTERVAL_MS = 15_000;   // retry every 15 s
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity → clear presence
const YT_VIDEO_BASE = 'https://www.youtube.com/watch?v=';
const LOCALSPO_URL = 'https://github.com/Fensacel/LocalSpo';

// ─── Service ─────────────────────────────────────────────

class DiscordService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private isEnabled: boolean = true;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private lastPayload: DiscordPresencePayload | null = null;

  /** Callback to push status change events to the renderer */
  private onStatusChange: ((connected: boolean) => void) | null = null;

  // ── Public API ──────────────────────────────────────────

  /** Register a callback to receive connection-status changes */
  setStatusChangeCallback(cb: (connected: boolean) => void): void {
    this.onStatusChange = cb;
  }

  /** Initialize the service (called once on app ready) */
  async initialize(clientId: string): Promise<void> {
    if (!clientId) {
      console.warn('[DiscordRPC] No DISCORD_CLIENT_ID set – Rich Presence disabled.');
      return;
    }

    this.createClient(clientId);
    await this.connect();
  }

  /** Enable or disable Rich Presence at runtime (Settings toggle) */
  async setEnabled(enabled: boolean, clientId?: string): Promise<void> {
    this.isEnabled = enabled;
    if (!enabled) {
      await this.clearPresence();
      this.shutdown();
    } else if (clientId) {
      this.createClient(clientId);
      await this.connect();
    }
  }

  /** Update Discord presence with current playback state */
  async updatePresence(payload: DiscordPresencePayload): Promise<void> {
    if (!this.isEnabled) return;
    this.lastPayload = payload;
    this.resetIdleTimer();

    if (!this.isConnected || !this.client) {
      // Will be retried on reconnect
      return;
    }

    try {
      const largeImageKey = (payload.coverUrl && (payload.coverUrl.startsWith('http://') || payload.coverUrl.startsWith('https://')))
        ? payload.coverUrl
        : 'localspo_logo';

      const stateText = payload.lyricLine?.trim()
        ? `${payload.artist || 'Unknown Artist'} • 🎤 ${payload.lyricLine.trim().slice(0, 75)}`
        : (payload.artist || 'Unknown Artist');

      if (!payload.isPlaying) {
        // Paused: no timestamps -> no progress bar, no timer
        await this.client.user?.setActivity({
          type: ActivityType.Listening,
          details: payload.title,
          state: stateText,
          largeImageKey,
          buttons: this.buildButtons(payload),
          instance: false,
        });
      } else {
        // Playing: send start & end timestamps in ms + single button -> renders exact Spotify sidebar card
        const nowMs = Date.now();
        const songDuration = Math.max(1, payload.duration || 180);
        const songCurrentTime = Math.max(0, payload.currentTime || 0);

        const startMs = Math.floor(nowMs - songCurrentTime * 1000);
        const endMs = Math.floor(startMs + songDuration * 1000);

        await this.client.user?.setActivity({
          type: ActivityType.Listening,
          details: payload.title,
          state: stateText,
          largeImageKey,
          startTimestamp: startMs,
          endTimestamp: endMs,
          buttons: this.buildButtons(payload),
          instance: false,
        });
      }

      console.log('[DiscordRPC] Presence Updated:', payload.title, '–', payload.artist);
    } catch (err) {
      console.warn('[DiscordRPC] Failed to update presence:', err);
      // Mark as disconnected so reconnect loop picks it up
      this.isConnected = false;
      this.emitStatus(false);
      this.scheduleReconnect();
    }
  }

  /** Clear Discord presence (stopped / disabled / idle) */
  async clearPresence(): Promise<void> {
    this.lastPayload = null;
    this.cancelIdleTimer();

    if (!this.isConnected || !this.client) return;

    try {
      await this.client.user?.clearActivity();
      console.log('[DiscordRPC] Presence cleared.');
    } catch (err) {
      console.warn('[DiscordRPC] Failed to clear presence:', err);
    }
  }

  /** Get current connection status */
  getStatus(): { connected: boolean; enabled: boolean } {
    return { connected: this.isConnected, enabled: this.isEnabled };
  }

  /** Clean shutdown (called on before-quit) */
  shutdown(): void {
    this.cancelReconnect();
    this.cancelIdleTimer();

    if (this.client) {
      try {
        this.client.destroy();
      } catch {
        // Ignore
      }
      this.client = null;
    }

    this.isConnected = false;
    this.emitStatus(false);
  }

  // ── Private helpers ─────────────────────────────────────

  private createClient(clientId: string): void {
    // Destroy any existing client first
    if (this.client) {
      try { this.client.destroy(); } catch { /* ignore */ }
      this.client = null;
    }

    this.client = new Client({ clientId });

    this.client.on('ready', () => {
      console.log('[DiscordRPC] Connected');
      this.isConnected = true;
      this.emitStatus(true);
      this.cancelReconnect();

      // Re-apply last known presence (e.g., after Discord restart)
      if (this.lastPayload && this.isEnabled) {
        this.updatePresence(this.lastPayload).catch(() => {});
      }
    });

    this.client.on('disconnected', () => {
      console.log('[DiscordRPC] Disconnected');
      this.isConnected = false;
      this.emitStatus(false);

      if (this.isEnabled) {
        this.scheduleReconnect();
      }
    });
  }

  private async connect(): Promise<void> {
    if (!this.client || !this.isEnabled) return;

    try {
      await this.client.login();
      // 'ready' event handles the success path
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Common case: Discord not running
      if (msg.includes('ENOENT') || msg.includes('connect') || msg.includes('RPC_CONNECTION_TIMEOUT')) {
        console.log('[DiscordRPC] Discord not running. Will retry...');
      } else {
        console.warn('[DiscordRPC] Connection error:', msg);
      }
      this.isConnected = false;
      this.emitStatus(false);

      if (this.isEnabled) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return; // Already scheduled
    if (!this.isEnabled) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      console.log('[DiscordRPC] Reconnecting...');

      if (!this.isEnabled || !this.client) return;

      try {
        await this.client.login();
      } catch {
        // Failed again – will retry via 'disconnected' event or schedule again
        if (this.isEnabled) {
          this.scheduleReconnect();
        }
      }
    }, RECONNECT_INTERVAL_MS);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resetIdleTimer(): void {
    this.cancelIdleTimer();
    this.idleTimer = setTimeout(() => {
      console.log('[DiscordRPC] Idle timeout reached – clearing presence.');
      this.clearPresence().catch(() => {});
    }, IDLE_TIMEOUT_MS);
  }

  private cancelIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private emitStatus(connected: boolean): void {
    this.onStatusChange?.(connected);
  }

  /** Build single clean button (matching Spotify's single Play button) */
  private buildButtons(_payload: DiscordPresencePayload): Array<{ label: string; url: string }> {
    return [{ label: 'Play on LocalSpo', url: LOCALSPO_URL }];
  }
}

// ─── Singleton ───────────────────────────────────────────
export const discordService = new DiscordService();
