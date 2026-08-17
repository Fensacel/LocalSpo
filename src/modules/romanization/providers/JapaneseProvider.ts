import * as wanakana from 'wanakana';

/**
 * Japanese Morphological Romanization Engine
 * Safe browser/renderer fallback + IPC support
 */
export class JapaneseProvider {
  private static kuroshiroInstance: any = null;
  private static initPromise: Promise<void> | null = null;
  private static isInitialized = false;

  private static async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Dynamically import to avoid Vite bundle top-level crash on Node built-ins
        const { default: Kuroshiro } = await import('kuroshiro');
        // @ts-ignore
        const { default: KuromojiAnalyzer } = await import('kuroshiro-analyzer-kuromoji');

        const instance = new Kuroshiro();
        const analyzer = new KuromojiAnalyzer({
          dictPath: '/dict/',
        });
        await instance.init(analyzer);
        this.kuroshiroInstance = instance;
        this.isInitialized = true;
      } catch (err) {
        console.warn('[JapaneseProvider] Kuroshiro initialization failed, falling back to Wanakana:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Primary async romanization method
   */
  static async romanizeAsync(text: string): Promise<string> {
    if (!text || !text.trim()) return text;

    try {
      // 1. Try IPC via Electron Main process if available
      if (typeof window !== 'undefined' && window.electronAPI && (window.electronAPI as any).romanize?.japanese) {
        const res = await (window.electronAPI as any).romanize.japanese(text);
        if (res) return res;
      }

      // 2. Try dynamic Kuroshiro in renderer
      await this.init();
      if (this.kuroshiroInstance && this.isInitialized) {
        const result = await this.kuroshiroInstance.convert(text, {
          to: 'romaji',
          mode: 'spaced',
          romajiSystem: 'hepburn',
        });
        if (result && result.trim()) {
          return result.charAt(0).toUpperCase() + result.slice(1);
        }
      }
    } catch (err) {
      console.warn('[JapaneseProvider] Kuroshiro conversion error:', err);
    }

    return this.romanizeFallback(text);
  }

  /**
   * Sync romanization fallback
   */
  static romanize(text: string): string {
    if (!text) return text;
    return this.romanizeFallback(text);
  }

  private static COMPOUND_MAP: Record<string, string> = {
    皆さん: 'minasan',
    皆: 'mina',
    悲しみ: 'kanashimi',
    悲し: 'kanashi',
    覚えられず: 'oboerarezu',
    覚え: 'oboe',
    切なさ: 'setsunasa',
    切な: 'setsuna',
    つかみはじめた: 'tsukamihajimeta',
    はじめた: 'hajimeta',
    探したのは: 'sagashita no wa',
    探した: 'sagashita',
    白い: 'shiroi',
    あの雲: 'ano kumo',
    突き抜けたらいつか: 'tsukinuketara itsuka',
    突き抜けた: 'tsukinuketa',
    突き抜け: 'tsukinuke',
    みつかると知って: 'mitsukaru to shitte',
    知って: 'shitte',
    振り切る: 'furikiru',
    振り切るほど: 'furikiru hodo',
    蒼い: 'aoi',
    あの空: 'ano sora',
    通り雨: 'tooriame',
    通り雨が: 'tooriame ga',
    木漏れ日: 'komorebi',
    名乗る: 'nanoru',
    居た: 'ita',
    前から: 'mae kara',
    重ねる: 'kasaneru',
    私達: 'watashitachi',
    僕達: 'bokutachi',
    あなた: 'anata',
    世界: 'sekai',
    未来: 'mirai',
    過去: 'kako',
    永遠: 'eien',
    約束: 'yakusoku',
    記憶: 'kioku',
    思い出: 'omoide',
    運命: 'unmei',
    奇跡: 'kiseki',
    希望: 'kibou',
    絶望: 'zetsubou',
    言葉: 'kotoba',
    心臓: 'shinzou',
    大丈夫: 'daijoubu',
    ありがとう: 'arigatou',
    さよなら: 'sayonara',
    昨日: 'kinou',
    今日: 'kyou',
    明日: 'ashita',
    目: 'me',
    場所: 'basho',
    笑顔: 'egao',
    落ちて: 'ochite',
    映して: 'utsushite',
    隠して: 'kakushite',
    答え: 'kotae',
    羽ばたいたら: 'habataitara',
    戻らないと: 'modoranai to',
    言って: 'itte',
    目指したのは: 'mezashita no wa',
  };

  private static KANJI_MAP: Record<string, string> = {
    皆: 'mina', 落: 'ochi', 映: 'utsu', 隠: 'kaku', 答: 'kotae',
    悲: 'kana', 覚: 'oboe', 切: 'setsu', 探: 'saga', 白: 'shiro', 雲: 'kumo',
    突: 'tsu', 抜: 'nuke', 振: 'furi', 蒼: 'ao', 青: 'ao', 赤: 'aka', 黒: 'kuro', 黄: 'ki', 緑: 'midori',
    通: 'too', 漏: 'mo', 名: 'na', 乗: 'no', 前: 'mae', 居: 'i', 羽: 'hane', 目: 'me', 指: 'yubi',
    木: 'ko', 日: 'hi', 雨: 'ame', 空: 'sora', 飛: 'tobi', 根: 'ne', 翼: 'tsubasa',
    引: 'hiki', 換: 'kae', 繋: 'tsuna', 合: 'a', 手: 'te', 選: 'era', 僕: 'boku',
    魅: 'mi', 夢: 'yume', 重: 'juu', 罪: 'tsumi', 愛: 'ai', 心: 'kokoro', 君: 'kimi',
    私: 'watashi', 今: 'ima', 夜: 'yoru', 月: 'tsuki', 星: 'hoshi', 風: 'kaze',
    海: 'umi', 花: 'hana', 光: 'hikari', 影: 'kage', 声: 'koe', 歌: 'uta', 音: 'oto',
    道: 'michi', 命: 'inochi', 生: 'iki', 死: 'shi', 時: 'toki', 人: 'hito',
    耳: 'mimi', 口: 'kuchi', 足: 'ashi', 頭: 'atama', 神: 'kami', 魂: 'tamashii',
    世: 'yo', 界: 'kai', 涙: 'namida', 笑: 'wara', 泣: 'naki', 想: 'omoi',
    思: 'omoi', 知: 'shi', 言: 'i', 見: 'mi', 聞: 'ki', 走: 'hashi', 歩: 'aru',
    泳: 'oyo', 登: 'nobo', 降: 'furu', 咲: 'saki', 散: 'chiru', 舞: 'mau', 流: 'nagare',
    燃: 'moe', 消: 'kie', 開: 'hira', 閉: 'toji', 始: 'haji', 終: 'owa', 守: 'mamo',
    勝: 'katsu', 負: 'make', 戦: 'tata', 祈: 'ino', 願: 'nega', 信: 'shin', 許: 'yuru',
  };

  private static romanizeFallback(text: string): string {
    if (!text) return text;
    let i = 0;
    const tokens: string[] = [];

    while (i < text.length) {
      const char = text[i];
      if (/\s/.test(char) || /[?,.!〜…〜-]/.test(char)) {
        tokens.push(char);
        i++;
        continue;
      }

      let matched = false;
      for (let len = 6; len >= 2; len--) {
        if (i + len <= text.length) {
          const phrase = text.slice(i, i + len);
          if (this.COMPOUND_MAP[phrase]) {
            tokens.push(this.COMPOUND_MAP[phrase]);
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (matched) continue;

      if (this.KANJI_MAP[char]) {
        tokens.push(this.KANJI_MAP[char]);
      } else {
        tokens.push(wanakana.toRomaji(char));
      }
      i++;
    }

    let res = tokens.join(' ').replace(/\s+/g, ' ').trim();
    if (res.length > 0) {
      res = res.charAt(0).toUpperCase() + res.slice(1);
    }
    return res;
  }
}


