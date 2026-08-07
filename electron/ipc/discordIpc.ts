/**
 * discordIpc.ts
 *
 * Registers Electron IPC handlers that bridge the renderer
 * to the DiscordService running in the main process.
 *
 * Channels:
 *  discord:updatePresence   – update Rich Presence with playback data
 *  discord:clearPresence    – clear Rich Presence
 *  discord:getStatus        – returns { connected, enabled }
 *  discord:setEnabled       – enable / disable the feature at runtime
 *
 * Push events (main → renderer):
 *  discord:statusChanged    – { connected: boolean }
 */

import { ipcMain, BrowserWindow } from 'electron';
import { discordService, type DiscordPresencePayload } from '../discord/discordService';

export function registerDiscordIpc(
  getClientId: () => string,
  getMainWindow: () => BrowserWindow | null,
): void {
  // ── Register status-change push events ──────────────────
  discordService.setStatusChangeCallback((connected: boolean) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('discord:statusChanged', { connected });
    }
  });

  // ── IPC handlers ────────────────────────────────────────

  /** Update presence – called by renderer on every playback state change */
  ipcMain.handle('discord:updatePresence', async (_event, payload: DiscordPresencePayload) => {
    try {
      await discordService.updatePresence(payload);
    } catch (err) {
      console.warn('[DiscordIPC] updatePresence error:', err);
    }
  });

  /** Clear presence – called when stopped / idle */
  ipcMain.handle('discord:clearPresence', async () => {
    try {
      await discordService.clearPresence();
    } catch (err) {
      console.warn('[DiscordIPC] clearPresence error:', err);
    }
  });

  /** Returns current connection status */
  ipcMain.handle('discord:getStatus', () => {
    return discordService.getStatus();
  });

  /**
   * Enable or disable Rich Presence at runtime.
   * Accepts { enabled: boolean }.
   */
  ipcMain.handle('discord:setEnabled', async (_event, enabled: boolean) => {
    try {
      const clientId = getClientId();
      await discordService.setEnabled(enabled, clientId);
    } catch (err) {
      console.warn('[DiscordIPC] setEnabled error:', err);
    }
  });
}
