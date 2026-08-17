import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('localspo', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('localspo');
}

// Suppress internal Chromium GPU cache warning in dev mode
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { registerScannerIpc } from './scanner';

// Load .env manually — Vite only exposes VITE_* vars to the renderer,
// but Electron main process needs direct env vars like DISCORD_CLIENT_ID.
// dist-electron/main.js lives one level below the project root.
try {
  const _mainDir = path.dirname(fileURLToPath(import.meta.url));
  const _projectRoot = path.resolve(_mainDir, '..');
  const _envPath = path.join(_projectRoot, '.env');
  if (fs.existsSync(_envPath)) {
    const envContent = fs.readFileSync(_envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) {
        if (value || !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('[Main] Loaded .env, DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? process.env.DISCORD_CLIENT_ID : 'NOT SET');
  }
} catch (e) { console.warn('[Main] Could not load .env:', e); }
import { registerDownloaderIpc } from './ipc/downloaderIpc';
import { registerPlaylistSyncIpc } from './ipc/playlistSyncIpc';
import { registerStreamingIpc } from './ipc/streamingIpc';
import { registerRomanizeIpc } from './ipc/romanizeIpc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

// Register custom protocol privileges before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-audio',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'local-image',
    privileges: {
      standard: false,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
]);

const DIST = path.join(__dirname, '../dist');
const ELECTRON_DIST = path.join(__dirname);
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function getDataPath(): string {
  const dataPath = path.join(app.getPath('userData'), 'LocalSpo');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

function ensureDirectories(): void {
  const root = getDataPath();
  const dirs = [
    path.join(root, 'config'),
    path.join(root, 'profile'),
    path.join(root, 'cache', 'covers'),
    path.join(root, 'cache', 'avatars'),
    path.join(root, 'cache', 'banners'),
    path.join(root, 'cache', 'lyrics'),
    path.join(root, 'cache', 'downloads'),
    path.join(root, 'cache', 'temp'),
    path.join(root, 'cache', 'logs'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function normalizeDataFileName(fileName: string): string {
  const base = path.basename(fileName);
  if (base === 'playlist.json') return 'playlists.json';
  return base;
}

function getConfigFilePath(fileName: string): string {
  const safeName = normalizeDataFileName(fileName);
  return path.join(getDataPath(), 'config', safeName);
}

function migrateLegacyData(): void {
  ensureDirectories();
  const root = getDataPath();
  const legacyRoot = path.join(app.getPath('userData'), 'localspo');
  const legacyRoots = [root, legacyRoot];

  const fileMappings: Record<string, string> = {
    'profile.json': 'profile.json',
    'settings.json': 'settings.json',
    'library.json': 'library.json',
    'playlist.json': 'playlists.json',
    'playlists.json': 'playlists.json',
    'queue.json': 'queue.json',
    'history.json': 'history.json',
    'stats.json': 'stats.json',
    'downloads.json': 'downloads.json',
    'favorites.json': 'favorites.json',
  };

  for (const dir of legacyRoots) {
    if (!fs.existsSync(dir)) continue;
    for (const [oldName, newName] of Object.entries(fileMappings)) {
      const srcPath = path.join(dir, oldName);
      const destPath = path.join(root, 'config', newName);
      if (fs.existsSync(srcPath) && !fs.existsSync(destPath) && srcPath !== destPath) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (err) {
          console.error(`[Migration] Failed copying ${srcPath} to ${destPath}:`, err);
        }
      }
    }
  }

  // Ensure default files exist in config/
  const configDir = path.join(root, 'config');
  const defaultFiles: Record<string, string> = {
    'profile.json': JSON.stringify({ profile: null }, null, 2),
    'settings.json': JSON.stringify({ musicFolders: [], theme: 'calm-monochrome', accentColor: '#FFFFFF', gapless: true, crossfade: false, crossfadeDuration: 3, visualizer: 'spectrum', lyricsEnabled: true, seekByLyricsEnabled: true, equalizerPreset: 'flat', equalizerBands: [0,0,0,0,0,0,0,0,0,0], windowBounds: { width: 1440, height: 900, isMaximized: false } }, null, 2),
    'library.json': JSON.stringify({ songs: [], albums: [], artists: [], lastScan: null }, null, 2),
    'playlists.json': JSON.stringify({ playlists: [] }, null, 2),
    'queue.json': JSON.stringify({ queue: [], queueIndex: -1, currentSong: null, currentTime: 0, volume: 0.8, isMuted: false, repeatMode: 'off', shuffleMode: 'off', sourceName: null }, null, 2),
    'history.json': JSON.stringify({ entries: [] }, null, 2),
    'stats.json': JSON.stringify({ plays: [], totalListeningSeconds: 0, streak: 0 }, null, 2),
    'downloads.json': JSON.stringify({ downloads: [] }, null, 2),
    'favorites.json': JSON.stringify({ songIds: [], albumIds: [], artistIds: [] }, null, 2),
  };

  for (const [filename, defaultData] of Object.entries(defaultFiles)) {
    const target = path.join(configDir, filename);
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, defaultData, 'utf-8');
    }
  }
}

let saveBoundsTimeout: NodeJS.Timeout | null = null;
function saveWindowBounds() {
  if (!mainWindow) return;
  if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
  saveBoundsTimeout = setTimeout(() => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      const settingsFile = getConfigFilePath('settings.json');
      let current: any = {};
      if (fs.existsSync(settingsFile)) {
        try { current = JSON.parse(fs.readFileSync(settingsFile, 'utf-8')); } catch {}
      }
      current.windowBounds = { ...bounds, isMaximized };
      fs.writeFileSync(settingsFile, JSON.stringify(current, null, 2), 'utf-8');
    } catch {}
  }, 1000);
}

function createWindow(): void {
  let width = 1440;
  let height = 900;
  let x: number | undefined;
  let y: number | undefined;
  let shouldMaximize = false;

  try {
    const settingsFile = getConfigFilePath('settings.json');
    if (fs.existsSync(settingsFile)) {
      const data = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      if (data.windowBounds) {
        width = data.windowBounds.width || 1440;
        height = data.windowBounds.height || 900;
        if (data.windowBounds.x !== undefined) x = data.windowBounds.x;
        if (data.windowBounds.y !== undefined) y = data.windowBounds.y;
        shouldMaximize = !!data.windowBounds.isMaximized;
      }
    }
  } catch {}

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: false,
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(ELECTRON_DIST, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'dist', 'icon.ico')
      : path.join(__dirname, '../public/icon.ico'),
  });

  mainWindow.once('ready-to-show', () => {
    if (shouldMaximize) {
      mainWindow?.maximize();
    }
    mainWindow?.show();
  });

  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper to serve local files with byte-range support for seeking
function serveLocalFile(filePath: string, request: Request): Response {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  let contentType = 'audio/mpeg';
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.flac') contentType = 'audio/flac';
  else if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.ogg' || ext === '.oga') contentType = 'audio/ogg';
  else if (ext === '.m4a') contentType = 'audio/mp4';
  else if (ext === '.mp3') contentType = 'audio/mpeg';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    return new Response(fileStream as any, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunksize),
        'Content-Type': contentType,
      }
    });
  } else {
    const fileStream = fs.createReadStream(filePath);
    return new Response(fileStream as any, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
      }
    });
  }
}

// Register protocol for local audio files using native net.fetch for robust range support & stream cancellation
function registerLocalProtocol(): void {
  // Prevent uncaught stream cancellation popups from undici/webstreams
  process.on('uncaughtException', (err) => {
    if (err && err.message && err.message.includes('ReadableStream')) {
      console.warn('[MainProcess] Ignored ReadableStream cancellation:', err.message);
      return;
    }
    console.error('[MainProcess] Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.warn('[MainProcess] Unhandled Rejection:', reason);
  });

  protocol.handle('local-audio', (request) => {
    try {
      let filePath = '';
      if (request.url.startsWith('local-audio://local/')) {
        filePath = request.url.slice('local-audio://local/'.length);
      } else if (request.url.startsWith('local-audio://')) {
        filePath = request.url.slice('local-audio://'.length);
      } else {
        filePath = request.url.slice('local-audio:'.length);
      }
      filePath = decodeURIComponent(filePath);
      if (filePath.startsWith('/') && process.platform === 'win32') {
        filePath = filePath.slice(1);
      }
      const resolvedPath = path.resolve(filePath);
      return serveLocalFile(resolvedPath, request);
    } catch (err) {
      console.error('[local-audio] Error serving audio file:', err);
      return new Response('File error', { status: 500 });
    }
  });

  protocol.handle('local-image', (request) => {
    try {
      let rawPath = '';
      if (request.url.startsWith('local-image://local/')) {
        rawPath = request.url.slice('local-image://local/'.length);
      } else if (request.url.startsWith('local-image://')) {
        rawPath = request.url.slice('local-image://'.length);
      } else {
        rawPath = request.url.slice('local-image:'.length);
      }
      rawPath = rawPath.split('?')[0];
      let filePath = decodeURIComponent(rawPath);

      if (process.platform === 'win32') {
        if (filePath.startsWith('/') && !filePath.startsWith('//')) {
          filePath = filePath.slice(1);
        }
        if (/^[a-zA-Z]\//.test(filePath)) {
          filePath = filePath[0] + ':' + filePath.slice(1);
        }
      }

      let resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        const dataRelative = path.join(getDataPath(), filePath);
        if (fs.existsSync(dataRelative)) {
          resolvedPath = dataRelative;
        } else {
          return new Response('Image not found', { status: 404 });
        }
      }

      const fileUrl = pathToFileURL(resolvedPath).toString();
      return net.fetch(fileUrl, { bypassCustomProtocolHandlers: true });
    } catch (err) {
      console.error('[local-image] Error serving image file:', err);
      return new Response('Image error', { status: 500 });
    }
  });
}

// ─── Auto Updater Setup ─────────────────────────────────

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendUpdateStatus = (data: {
    status: string;
    version?: string;
    releaseName?: string;
    releaseNotes?: string | Array<{ note?: string | null }>;
    percent?: number;
    error?: string;
  }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', data);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      version: info.version,
      releaseName: info.releaseName || undefined,
      releaseNotes: info.releaseNotes || undefined,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({ status: 'not-available', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({ status: 'error', error: err?.message || 'Update check failed' });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateStatus({
      status: 'downloading',
      percent: Math.round(progressObj.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      status: 'downloaded',
      version: info.version,
      releaseName: info.releaseName || undefined,
      releaseNotes: info.releaseNotes || undefined,
    });
  });
}

// ─── IPC Handlers ───────────────────────────────────────

function registerIpcHandlers(): void {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

  // Dialogs
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openFile', async (_event, options?: { filters?: Array<{ name: string; extensions: string[] }> }) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      title: 'Select File',
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const src = result.filePaths[0];
    // Copy to app data to ensure persistent access
    const ext = path.extname(src);
    const destDir = path.join(getDataPath(), 'covers');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destName = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    const destPath = path.join(destDir, destName);
    fs.copyFileSync(src, destPath);
    return destPath.replace(/\\/g, '/');
  });

  ipcMain.handle('dialog:openImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      title: 'Select Playlist Cover Image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const src = result.filePaths[0];
    const ext = path.extname(src);
    const destDir = path.join(getDataPath(), 'covers');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destName = `cover_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    const destPath = path.join(destDir, destName);
    fs.copyFileSync(src, destPath);
    return destPath.replace(/\\/g, '/');
  });

  // Auto Updater IPC
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:status', { status: 'not-available', version: app.getVersion() });
      }
      return { status: 'dev-mode' };
    }
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err: any) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:status', { status: 'error', error: err?.message || 'Check failed' });
      }
      return null;
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err: any) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:status', { status: 'error', error: err?.message || 'Download failed' });
      }
      return null;
    }
  });

  ipcMain.on('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall();
  });

  // App version & paths
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getDataPath', () => getDataPath());
  ipcMain.handle('app:getUserDataPath', () => app.getPath('userData'));

  // Data persistence
  ipcMain.handle('data:read', async (_event, fileName: string) => {
    try {
      const filePath = getConfigFilePath(fileName);
      if (!fs.existsSync(filePath)) {
        // Fallback check in root dataPath if migration didn't move it
        const fallbackPath = path.join(getDataPath(), path.basename(fileName));
        if (fs.existsSync(fallbackPath)) {
          const content = fs.readFileSync(fallbackPath, 'utf-8');
          return JSON.parse(content);
        }
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`Error reading data file ${fileName}:`, err);
      return null;
    }
  });

  ipcMain.handle('data:write', async (_event, fileName: string, data: unknown) => {
    try {
      const filePath = getConfigFilePath(fileName);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Error writing data file ${fileName}:`, err);
      return false;
    }
  });

  // Profile Upload Handlers
  ipcMain.handle('cache:image', async (_event, url?: string) => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }

    try {
      const hash = crypto.createHash('sha256').update(cleanUrl).digest('hex');
      const extMatch = cleanUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)($|\?)/i);
      const ext = extMatch ? `.${extMatch[1]}` : '.png';
      const filename = `${hash}${ext}`;

      const coversDir = path.join(getDataPath(), 'cache', 'covers');
      if (!fs.existsSync(coversDir)) {
        fs.mkdirSync(coversDir, { recursive: true });
      }

      const filePath = path.join(coversDir, filename);
      const relativePath = `cache/covers/${filename}`;

      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
        return `local-image://${relativePath}`;
      }

      const response = await fetch(cleanUrl);
      if (!response.ok) return cleanUrl;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);

      return `local-image://${relativePath}`;
    } catch (err) {
      console.error('Error caching artwork image:', err);
      return cleanUrl;
    }
  });

  ipcMain.handle('profile:uploadAvatar', async (_event, filePath?: string) => {
    try {
      let srcPath = filePath;
      if (!srcPath) {
        const result = await dialog.showOpenDialog(mainWindow!, {
          properties: ['openFile'],
          title: 'Select Avatar Image',
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        srcPath = result.filePaths[0];
      }
      const ext = path.extname(srcPath) || '.png';
      const profileDir = path.join(getDataPath(), 'profile');
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
      const destPath = path.join(profileDir, `avatar${ext}`);
      fs.copyFileSync(srcPath, destPath);
      return `profile/avatar${ext}`.replace(/\\/g, '/');
    } catch (err) {
      console.error('[profile:uploadAvatar] Error:', err);
      return null;
    }
  });

  ipcMain.handle('profile:uploadBanner', async (_event, filePath?: string) => {
    try {
      let srcPath = filePath;
      if (!srcPath) {
        const result = await dialog.showOpenDialog(mainWindow!, {
          properties: ['openFile'],
          title: 'Select Banner Image',
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        srcPath = result.filePaths[0];
      }
      const ext = path.extname(srcPath) || '.png';
      const profileDir = path.join(getDataPath(), 'profile');
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
      const destPath = path.join(profileDir, `banner${ext}`);
      fs.copyFileSync(srcPath, destPath);
      return `profile/banner${ext}`.replace(/\\/g, '/');
    } catch (err) {
      console.error('[profile:uploadBanner] Error:', err);
      return null;
    }
  });

  // File operations
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }));
  });

  ipcMain.handle('fs:stat', async (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    return { size: stat.size, mtime: stat.mtimeMs };
  });

  ipcMain.handle('shell:openExternal', async (_event, urlStr: string) => {
    try {
      await shell.openExternal(urlStr);
      return true;
    } catch (err) {
      console.error('[Main] shell.openExternal failed:', err);
      return false;
    }
  });

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: Buffer | string) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data);
    return true;
  });

  // Path utilities
  ipcMain.handle('path:join', async (_event, ...segments: string[]) => {
    return path.join(...segments);
  });

  ipcMain.handle('path:basename', async (_event, filePath: string) => {
    return path.basename(filePath);
  });

  ipcMain.handle('path:dirname', async (_event, filePath: string) => {
    return path.dirname(filePath);
  });

  ipcMain.handle('path:extname', async (_event, filePath: string) => {
    return path.extname(filePath).toLowerCase();
  });
}

import { registerOBSIpc } from './ipc/obsIpc';
import { registerTaskbarIpc } from './ipc/taskbarIpc';
import { registerDiscordIpc } from './ipc/discordIpc';
import { discordService } from './discord/discordService';

// ─── Single Instance & Deep Link Setup ──────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const deepLink = commandLine.find((arg) => arg.startsWith('localspo://'));
      if (deepLink) {
        mainWindow.webContents.send('auth:deep-link', deepLink);
      }
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('auth:deep-link', url);
  }
});

// ─── Discord Client ID accessor ─────────────────────────
function getDiscordClientId(): string {
  return process.env.DISCORD_CLIENT_ID?.trim() || '1535231503741751437';
}

app.whenReady().then(async () => {
  registerLocalProtocol();
  migrateLegacyData();
  registerIpcHandlers();
  registerScannerIpc(getDataPath);
  const downloaderService = registerDownloaderIpc(getDataPath);
  registerPlaylistSyncIpc(getDataPath, downloaderService);
  registerStreamingIpc(getDataPath, () => mainWindow);
  registerOBSIpc(getDataPath);
  registerTaskbarIpc(() => mainWindow);
  registerRomanizeIpc();

  // Discord Rich Presence – register IPC bridge and auto-connect
  registerDiscordIpc(getDiscordClientId, () => mainWindow);
  const discordClientId = getDiscordClientId();
  if (discordClientId) {
    discordService.initialize(discordClientId).catch((err) => {
      console.warn('[DiscordRPC] Initial connect failed (Discord may not be running):', err?.message);
    });
  } else {
    console.warn('[DiscordRPC] DISCORD_CLIENT_ID not set – Rich Presence is disabled.');
  }

  setupAutoUpdater();
  createWindow();

  // Check for updates automatically in packaged build
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('[AutoUpdater] Failed auto-check:', err);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cleanly shutdown Discord RPC before the app quits
app.on('before-quit', () => {
  discordService.clearPresence().catch(() => {});
  discordService.shutdown();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
