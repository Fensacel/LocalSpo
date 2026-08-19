import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import Kuroshiro from 'kuroshiro';
// @ts-ignore
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

let kuroshiroInstance: any = null;
let initPromise: Promise<void> | null = null;

async function initKuroshiro() {
  if (kuroshiroInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Find dict path for kuromoji
      const candidatePaths = [
        path.join(process.cwd(), 'node_modules', 'kuromoji', 'dict'),
        path.join(app.getAppPath(), 'node_modules', 'kuromoji', 'dict'),
        path.join(app.getAppPath(), 'public', 'dict'),
        path.join(__dirname, '../public/dict'),
        path.join(__dirname, '../../node_modules/kuromoji/dict'),
        path.join(process.cwd(), 'public', 'dict'),
      ];

      const dictPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];

      console.log('[RomanizeIPC] Loading Kuromoji dictionary from:', dictPath);

      const KuroshiroClass: any =
        (Kuroshiro as any)?.default?.default || (Kuroshiro as any)?.default || Kuroshiro;
      const KuromojiAnalyzerClass: any =
        (KuromojiAnalyzer as any)?.default?.default ||
        (KuromojiAnalyzer as any)?.default ||
        KuromojiAnalyzer;

      const instance = new KuroshiroClass();
      const analyzer = new KuromojiAnalyzerClass({ dictPath });
      await instance.init(analyzer);
      kuroshiroInstance = instance;
      console.log('[RomanizeIPC] Kuroshiro initialized successfully in Main process');
    } catch (err) {
      console.error('[RomanizeIPC] Failed to initialize Kuroshiro in Main process:', err);
    }
  })();

  return initPromise;
}

export function registerRomanizeIpc() {
  ipcMain.handle('romanize:japanese', async (_event, text: string) => {
    if (!text || !text.trim()) return text;
    try {
      await initKuroshiro();
      if (kuroshiroInstance) {
        const rom = await kuroshiroInstance.convert(text, {
          to: 'romaji',
          mode: 'spaced',
          romajiSystem: 'hepburn',
        });
        if (rom && rom.trim()) {
          const clean = rom
            .replace(/\s+([,.:;!?])/g, '$1')
            .replace(/\s+([)\]}’”"'])/g, '$1')
            .replace(/([(\[{‘“"'])\s+/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        }
      }
    } catch (err) {
      console.warn('[RomanizeIPC] Japanese conversion error:', err);
    }
    return null;
  });
}
