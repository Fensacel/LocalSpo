export interface LyricsResult {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  source: 'lrclib' | 'musixmatch' | 'none';
}

export class LyricsApi {
  private static musixmatchToken: string | null = null;

  public static normalizeStr(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fa5\uac00-\ud7a3\u3040-\u309f\u30a0-\u30ff\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static cleanArtist(artist: string): string {
    if (!artist) return '';
    let a = artist
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s+VEVO$/i, '')
      .replace(/VEVO$/i, '')
      .replace(/\s+Official\s+Channel$/i, '')
      .replace(/\s+Official$/i, '')
      .trim();

    return a;
  }

  public static cleanTitle(title: string, artistName?: string): string {
    if (!title) return '';
    let t = title.trim();

    // 1. Remove artist prefix if present (e.g. "Ghea Indrawari - 1000X" -> "1000X")
    if (artistName) {
      const artClean = this.cleanArtist(artistName).toLowerCase();
      if (t.toLowerCase().startsWith(artClean + ' - ')) {
        t = t.slice(artClean.length + 3).trim();
      } else if (t.toLowerCase().startsWith(artClean + ' : ')) {
        t = t.slice(artClean.length + 3).trim();
      }
    }

    const dashIdx = t.indexOf(' - ');
    if (dashIdx > 0 && dashIdx < t.length / 2) {
      const prefix = t.slice(0, dashIdx).trim().toLowerCase();
      if (artistName && (prefix === artistName.toLowerCase() || artistName.toLowerCase().includes(prefix))) {
        t = t.slice(dashIdx + 3).trim();
      }
    }

    // 2. Remove video / tag noise
    t = t
      .replace(/^["'“”„](.*)["'“”„]$/, '$1')
      .replace(/["'“”„]/g, '')
      .replace(/\[(Official\s*(?:Music\s*)?Video|Official\s*Audio|Official\s*Visualizer|Visualizer|Lyric\s*Video|Audio|Lyrics|Performance\s*Video|M\/V|MV|HD|4K)\]/gi, '')
      .replace(/\((Official\s*(?:Music\s*)?Video|Official\s*Audio|Official\s*Visualizer|Visualizer|Lyric\s*Video|Audio|Lyrics|Performance\s*Video|M\/V|MV|HD|4K)\)/gi, '')
      .replace(/\((.*?)(ver\b|version\b|remix\b|mix\b|edit\b|acoustic\b|live\b|instrumental\b|sped\s*up\b|slowed\b)(.*?)\)/gi, '')
      .replace(/\[(.*?)(ver\b|version\b|remix\b|mix\b|edit\b|acoustic\b|live\b|instrumental\b|sped\s*up\b|slowed\b)(.*?)\]/gi, '')
      .replace(/\((?:feat|ft)\.?\s*.*?\)/gi, '')
      .replace(/\[(?:feat|ft)\.?\s*.*?\]/gi, '')
      .replace(/\b(?:feat|ft)\.?\s+.*$/gi, '')
      .replace(/\s*-\s*Single$/i, '')
      .replace(/\s*-\s*EP$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    return t;
  }

  public static isTitleMatch(candidateTitle: string | undefined, targetTitle: string): boolean {
    if (!candidateTitle || !targetTitle) return false;

    const cClean = this.cleanTitle(candidateTitle);
    const tClean = this.cleanTitle(targetTitle);

    const cNorm = this.normalizeStr(cClean);
    const tNorm = this.normalizeStr(tClean);

    if (!cNorm || !tNorm) return false;
    if (cNorm === tNorm) return true;

    const cNoSpace = cNorm.replace(/\s+/g, '');
    const tNoSpace = tNorm.replace(/\s+/g, '');
    if (cNoSpace === tNoSpace) return true;

    const cWords = cNorm.split(' ').filter((w) => w.length > 0);
    const tWords = tNorm.split(' ').filter((w) => w.length > 0);

    if (cWords.length === 0 || tWords.length === 0) return false;

    const filterIgnored = (words: string[]) =>
      words.filter(
        (w) => !['live', 'remix', 'version', 'acoustic', 'edit', 'audio', 'video', 'visualizer', 'instrumental', 'ver', 'rock'].includes(w)
      );

    const cCore = filterIgnored(cWords);
    const tCore = filterIgnored(tWords);

    if (cCore.join(' ') === tCore.join(' ')) return true;

    if (cCore.length === tCore.length && cCore.length > 0) {
      return cCore.every((w, i) => w === tCore[i]);
    }

    // Substring or word inclusion relaxed check
    return cNorm.includes(tNorm) || tNorm.includes(cNorm) || cNoSpace.includes(tNoSpace) || tNoSpace.includes(cNoSpace);
  }

  public static isArtistMatch(candidateArtist: string | undefined, targetArtist: string): boolean {
    if (!candidateArtist || !targetArtist) return false;
    const caClean = this.cleanArtist(candidateArtist);
    const taClean = this.cleanArtist(targetArtist);
    const ca = this.normalizeStr(caClean);
    const ta = this.normalizeStr(taClean);
    if (!ca || !ta) return false;
    if (ca === ta) return true;

    const caNoSpace = ca.replace(/\s+/g, '');
    const taNoSpace = ta.replace(/\s+/g, '');
    if (caNoSpace === taNoSpace) return true;

    // Check alias or parenthetical names e.g. "TWICE (트와이스)" or "AtHeart (앳하트)" or "Hearts2Hearts (하츠투하츠)"
    const extractNames = (raw: string) => {
      const names = [this.normalizeStr(raw)];
      const match = raw.match(/^(.*?)\((.*?)\)$/);
      if (match) {
        names.push(this.normalizeStr(match[1]));
        names.push(this.normalizeStr(match[2]));
      }
      return names.filter(Boolean);
    };

    const cNames = extractNames(caClean);
    const tNames = extractNames(taClean);

    for (const cn of cNames) {
      for (const tn of tNames) {
        if (cn === tn) return true;
        const cnNS = cn.replace(/\s+/g, '');
        const tnNS = tn.replace(/\s+/g, '');
        if (cnNS === tnNS) return true;
        if (cnNS.length >= 3 && tnNS.length >= 3 && (cnNS.includes(tnNS) || tnNS.includes(cnNS))) return true;
      }
    }

    // Split multiple artists (feat, with, comma, &, /)
    const splitArtists = (str: string) =>
      str.split(/[,&/]|feat\.?|ft\.?|with/i).map((s) => this.normalizeStr(s)).filter(Boolean);

    const caList = splitArtists(candidateArtist);
    const taList = splitArtists(targetArtist);

    for (const c of caList) {
      for (const t of taList) {
        const cNS = c.replace(/\s+/g, '');
        const tNS = t.replace(/\s+/g, '');
        if (c === t || cNS === tNS || (cNS.length >= 3 && tNS.length >= 3 && (cNS.includes(tNS) || tNS.includes(cNS)))) {
          return true;
        }
      }
    }

    return false;
  }

  private static getHeaders() {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
  }

  /**
   * ── Provider: Genius API (Most comprehensive global and K-Pop lyrics DB) ──
   */
  private static async fetchGenius(artist: string, title: string): Promise<LyricsResult | null> {
    try {
      const query = `${artist} ${title}`.trim();
      const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data: any = await res.json();
        const hits = data?.response?.sections?.find((s: any) => s.type === 'song')?.hits;
        if (Array.isArray(hits) && hits.length > 0) {
          for (const hitObj of hits) {
            const hit = hitObj?.result;
            if (!hit) continue;

            const candArtist = hit.primary_artist?.name;
            const candTitle = hit.title;

            const artistMatches = this.isArtistMatch(candArtist, artist);
            const titleMatches = this.isTitleMatch(candTitle, title);

            if (!artistMatches && !titleMatches) {
              continue;
            }

            const songPath = hit.path;
            if (!songPath) continue;

            const songUrl = `https://genius.com${songPath}`;
            const pageRes = await fetch(songUrl, {
              headers: this.getHeaders(),
              signal: AbortSignal.timeout(3500),
            });

            if (pageRes.ok) {
              const html = await pageRes.text();
              let fullText = '';

              const rootIdx = html.indexOf('id="lyrics-root"');
              if (rootIdx !== -1) {
                const afterRoot = html.slice(rootIdx);
                const endIdx = afterRoot.indexOf('id="question-list"');
                const lyricsHtml = endIdx !== -1 ? afterRoot.slice(0, endIdx) : afterRoot.slice(0, 35000);
                fullText = lyricsHtml
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<\/div>/gi, '\n')
                  .replace(/<\/p>/gi, '\n')
                  .replace(/<[^>]+>/g, '')
                  .replace(/&#x27;/g, "'")
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/^id="lyrics-root"[^\n]*/gim, '')
                  .replace(/^[0-9]+\s*Contributors.*$/gim, '')
                  .replace(/^.*Lyrics\s*$/gim, '')
                  .replace(/You might also like/gi, '')
                  .replace(/Embed$/gim, '')
                  .replace(/Translations.*$/gim, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                fullText = fullText
                  .split(/CancelHow to Format Lyrics|AboutHave the inside scoop|Sign up and drop some knowledge/i)[0]
                  .trim();
              }

              if (!fullText || fullText.length < 20) {
                const regex = /<div[^>]*data-lyrics-container=["']true["'][^>]*>([\s\S]*?)<\/div>/gi;
                const matches = [...html.matchAll(regex)];
                if (matches.length > 0) {
                  fullText = matches
                    .map((m) =>
                      m[1]
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<[^>]+>/g, '')
                        .replace(/^[0-9]+\s*Contributors.*?Translations.*$/gim, '')
                        .trim()
                    )
                    .filter(Boolean)
                    .join('\n\n')
                    .replace(/^[0-9]+\s*Contributors.*$/gim, '')
                    .trim();
                }
              }

              if (fullText && fullText.length > 20) {
                console.log(`[LyricsApi] Genius lyrics hit for: ${artist} - ${title}`);
                return {
                  syncedLyrics: null,
                  plainLyrics: fullText,
                  source: 'none',
                };
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[LyricsApi] Genius fetch error:', e);
    }
    return null;
  }

  /**
   * ── Provider: AZLyrics (Authentic K-Pop & Global lyrics scraper) ──
   */
  private static async fetchAzLyrics(artist: string, title: string): Promise<LyricsResult | null> {
    try {
      const artClean = this.cleanArtist(artist).replace(/\(.*?\)/g, '').trim();
      const titClean = this.cleanTitle(title).replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const artistSlug = artClean.toLowerCase().replace(/[^a-z0-9]/g, '');
      const titleSlug = titClean.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!artistSlug || !titleSlug) return null;

      const url = `https://www.azlyrics.com/lyrics/${artistSlug}/${titleSlug}.html`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const html = await res.text();
        const marker = '<!-- Usage of azlyrics.com content by any third-party';
        const idx = html.indexOf(marker);
        if (idx !== -1) {
          const after = html.slice(idx);
          const divEnd = after.indexOf('</div>');
          const raw = after.slice(after.indexOf('-->') + 3, divEnd);
          const clean = raw.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
          if (clean.length > 20) {
            let resultText = clean;
            // For K-Pop lyrics with both [Korean:] and [Romanized:] sections, use Korean Hangul as primary text
            if (clean.includes('[Korean:]')) {
              const kIdx = clean.indexOf('[Korean:]');
              resultText = clean.slice(kIdx + 9).trim();
            }
            console.log(`[LyricsApi] AZLyrics hit for: ${artist} - ${title}`);
            return {
              syncedLyrics: null,
              plainLyrics: resultText,
              source: 'none',
            };
          }
        }
      }
    } catch {}
    return null;
  }

  /**
   * ── Provider: Lyrics.ovh (Ultra fast global plain lyrics DB) ──
   */
  private static async fetchLyricsOvh(artist: string, title: string): Promise<LyricsResult | null> {
    try {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.lyrics && data.lyrics.trim().length > 10) {
          console.log(`[LyricsApi] Lyrics.ovh hit for: ${artist} - ${title}`);
          return {
            syncedLyrics: null,
            plainLyrics: data.lyrics.trim(),
            source: 'none',
          };
        }
      }
    } catch {}
    return null;
  }

  /**
   * ── Provider: NetEase Cloud Music ──
   */
  private static async fetchNetease(artist: string, title: string): Promise<LyricsResult | null> {
    try {
      const queries = [`${artist} ${title}`.trim(), title.trim()];
      for (const query of queries) {
        const searchRes = await fetch(
          `https://music.163.com/api/search/get?s=${encodeURIComponent(query)}&type=1&limit=5`,
          {
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(2500),
          }
        );
        if (searchRes.ok) {
          const searchData: any = await searchRes.json();
          const songs = searchData?.result?.songs;
          if (Array.isArray(songs) && songs.length > 0) {
            for (const s of songs) {
              const songName = s.name || '';
              const artistNames = (s.artists || []).map((a: any) => a.name || '');

              const artistMatches = artistNames.some((an: string) => this.isArtistMatch(an, artist));
              const titleMatches = this.isTitleMatch(songName, title);

              if (!artistMatches || !titleMatches) {
                continue;
              }

              const songId = s.id;
              const lrcRes = await fetch(
                `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`,
                {
                  headers: this.getHeaders(),
                  signal: AbortSignal.timeout(2000),
                }
              );
              if (lrcRes.ok) {
                const lrcData: any = await lrcRes.json();
                const lyricStr = lrcData?.lrc?.lyric;
                if (lyricStr && lyricStr.trim().length > 15 && !lyricStr.includes('纯音乐,请欣赏')) {
                  console.log(`[LyricsApi] NetEase lyrics hit for: ${artist} - ${title}`);
                  return {
                    syncedLyrics: lyricStr,
                    plainLyrics: null,
                    source: 'lrclib',
                  };
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[LyricsApi] NetEase fetch error:', e);
    }
    return null;
  }

  /**
   * ── Provider: Musixmatch Desktop API ──
   */
  private static async getMusixmatchToken(): Promise<string | null> {
    if (this.musixmatchToken) return this.musixmatchToken;
    try {
      const res = await fetch(
        'https://apic-desktop.musixmatch.com/ws/1.1/token.get?format=json&app_id=web-desktop-app-v1.0',
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(2000),
        }
      );
      if (res.ok) {
        const data: any = await res.json();
        const token = data?.message?.body?.user_token;
        if (token) {
          this.musixmatchToken = token;
          return token;
        }
      }
    } catch {}
    return null;
  }

  private static async fetchMusixmatch(artist: string, title: string): Promise<LyricsResult | null> {
    try {
      const token = await this.getMusixmatchToken();
      if (!token) return null;

      const url = `https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&q_artist=${encodeURIComponent(
        artist
      )}&q_track=${encodeURIComponent(title)}&usertoken=${token}&app_id=web-desktop-app-v1.0`;

      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(2500),
      });

      if (res.ok) {
        const data: any = await res.json();
        const macroCalls = data?.message?.body?.macro_calls;

        const subtitleBody =
          macroCalls?.['track.subtitles.get']?.message?.body?.subtitle_list?.[0]?.subtitle?.subtitle_body;
        if (subtitleBody && subtitleBody.trim().length > 0) {
          console.log(`[LyricsApi] Musixmatch SYNCED lyrics hit for: ${artist} - ${title}`);
          return {
            syncedLyrics: subtitleBody,
            plainLyrics: null,
            source: 'musixmatch',
          };
        }

        const lyricsBody = macroCalls?.['track.lyrics.get']?.message?.body?.lyrics?.lyrics_body;
        if (lyricsBody && lyricsBody.trim().length > 0) {
          console.log(`[LyricsApi] Musixmatch PLAIN lyrics hit for: ${artist} - ${title}`);
          return {
            syncedLyrics: null,
            plainLyrics: lyricsBody,
            source: 'musixmatch',
          };
        }
      }
    } catch {}
    return null;
  }

  /**
   * ── Multi-Provider Lyrics Search (Ultra Fast Concurrent Query) ──
   */
  public static async fetchLyrics(
    artist: string,
    title: string,
    album?: string,
    durationSeconds?: number
  ): Promise<LyricsResult> {
    const primaryArtist = this.cleanArtist(artist);
    const rawArtist = artist.replace(/\s*-\s*Topic$/i, '').trim();
    const cleanTitle = this.cleanTitle(title, primaryArtist);

    if (!primaryArtist || !cleanTitle) {
      return { syncedLyrics: null, plainLyrics: null, source: 'none' };
    }

    console.log(`[LyricsApi] Starting fast multi-provider fetch for: "${primaryArtist}" - "${cleanTitle}"`);

    // 1. Concurrent Fetch across all major providers in parallel
    const [lrclibRes, musixmatchRes, neteaseRes, geniusRes, azlyricsRes] = await Promise.allSettled([
      this.fetchLrclibFast(primaryArtist, cleanTitle, durationSeconds, rawArtist),
      this.fetchMusixmatch(primaryArtist, cleanTitle),
      this.fetchNetease(primaryArtist, cleanTitle),
      this.fetchGenius(primaryArtist, cleanTitle),
      this.fetchAzLyrics(primaryArtist, cleanTitle),
    ]);

    const validResults = [
      lrclibRes.status === 'fulfilled' ? lrclibRes.value : null,
      neteaseRes.status === 'fulfilled' ? neteaseRes.value : null,
      musixmatchRes.status === 'fulfilled' ? musixmatchRes.value : null,
      geniusRes.status === 'fulfilled' ? geniusRes.value : null,
      azlyricsRes.status === 'fulfilled' ? azlyricsRes.value : null,
    ].filter(Boolean) as LyricsResult[];

    const isJapaneseReq =
      /japanese|\bjapan\b|\bjpn\b|\bjp\s*ver|[\u3040-\u30ff]/i.test(title) ||
      /japanese|\bjapan\b|\bjpn\b|\bjp\s*ver|[\u3040-\u30ff]/i.test(cleanTitle);

    const isKoreanReq =
      !isJapaneseReq &&
      (/korean|\bkor\b|\bkr\s*ver|[\uac00-\ud7a3]/i.test(title) ||
        /korean|\bkor\b|\bkr\s*ver|[\uac00-\ud7a3]/i.test(cleanTitle));

    // Priority 1: Synced lyrics matching the requested language
    if (isJapaneseReq) {
      const jpSynced = validResults.find(
        (r) => r.syncedLyrics && /[\u3040-\u30ff]/.test(r.syncedLyrics)
      );
      if (jpSynced) {
        console.log(`[LyricsApi] Selected Japanese Synced Lyrics for: ${primaryArtist} - ${cleanTitle}`);
        return jpSynced;
      }
    }

    if (isKoreanReq) {
      const hangulSynced = validResults.find(
        (r) => r.syncedLyrics && /[\uac00-\ud7a3]/.test(r.syncedLyrics)
      );
      if (hangulSynced) {
        console.log(`[LyricsApi] Selected Korean Hangul Synced Lyrics for: ${primaryArtist} - ${cleanTitle}`);
        return hangulSynced;
      }
    }

    // Priority 2: LRCLIB Synced (LRCLIB has best timestamp accuracy)
    if (lrclibRes.status === 'fulfilled' && lrclibRes.value?.syncedLyrics) {
      if (!isJapaneseReq || /[\u3040-\u30ff]/.test(lrclibRes.value.syncedLyrics)) {
        console.log(`[LyricsApi] Selected LRCLIB Synced for: ${primaryArtist} - ${cleanTitle}`);
        return lrclibRes.value;
      }
    }

    // Priority 3: NetEase Synced
    if (neteaseRes.status === 'fulfilled' && neteaseRes.value?.syncedLyrics) {
      if (!isJapaneseReq || /[\u3040-\u30ff]/.test(neteaseRes.value.syncedLyrics)) {
        console.log(`[LyricsApi] Selected NetEase Synced for: ${primaryArtist} - ${cleanTitle}`);
        return neteaseRes.value;
      }
    }

    // Priority 4: Musixmatch Synced
    if (musixmatchRes.status === 'fulfilled' && musixmatchRes.value?.syncedLyrics) {
      if (!isJapaneseReq || /[\u3040-\u30ff]/.test(musixmatchRes.value.syncedLyrics)) {
        console.log(`[LyricsApi] Selected Musixmatch Synced for: ${primaryArtist} - ${cleanTitle}`);
        return musixmatchRes.value;
      }
    }

    // Priority 5: Fallback any synced if available
    const anySynced = validResults.find((r) => !!r.syncedLyrics);
    if (anySynced) {
      console.log(`[LyricsApi] Selected Available Synced for: ${primaryArtist} - ${cleanTitle}`);
      return anySynced;
    }

    // Priority 6: Genius authentic complete lyrics
    if (geniusRes.status === 'fulfilled' && geniusRes.value?.plainLyrics) {
      console.log(`[LyricsApi] Selected Genius for: ${primaryArtist} - ${cleanTitle}`);
      return geniusRes.value;
    }

    // Priority 7: AZLyrics (Hangul / original)
    if (azlyricsRes.status === 'fulfilled' && azlyricsRes.value?.plainLyrics) {
      console.log(`[LyricsApi] Selected AZLyrics for: ${primaryArtist} - ${cleanTitle}`);
      return azlyricsRes.value;
    }

    // Priority 8: Plain lyrics from LRCLIB
    if (lrclibRes.status === 'fulfilled' && lrclibRes.value?.plainLyrics) {
      console.log(`[LyricsApi] Selected LRCLIB Plain for: ${primaryArtist} - ${cleanTitle}`);
      return lrclibRes.value;
    }

    // Priority 9: Plain lyrics from Musixmatch
    if (musixmatchRes.status === 'fulfilled' && musixmatchRes.value?.plainLyrics) {
      console.log(`[LyricsApi] Selected Musixmatch Plain for: ${primaryArtist} - ${cleanTitle}`);
      return musixmatchRes.value;
    }

    // Priority 10: Lyrics.ovh fallback
    const ovhRes = await this.fetchLyricsOvh(primaryArtist, cleanTitle);
    if (ovhRes) {
      console.log(`[LyricsApi] Selected Lyrics.ovh for: ${primaryArtist} - ${cleanTitle}`);
      return ovhRes;
    }

    return {
      syncedLyrics: null,
      plainLyrics: null,
      source: 'none',
    };
  }

  private static async fetchLrclibFast(
    artist: string,
    title: string,
    durationSeconds?: number,
    rawArtist?: string
  ): Promise<LyricsResult | null> {
    const artistVariants = Array.from(new Set([artist, rawArtist].filter(Boolean) as string[]));

    // 1. Structured search with track_name and artist_name (Highest accuracy on LRCLIB!)
    for (const art of artistVariants) {
      try {
        const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(
          title
        )}&artist_name=${encodeURIComponent(art)}`;
        const res = await fetch(searchUrl, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
          const results = (await res.json()) as any[];
          if (Array.isArray(results) && results.length > 0) {
            const syncedCandidate = results.find(
              (r) => r.syncedLyrics && this.isArtistMatch(r.artistName, art) && this.isTitleMatch(r.trackName, title)
            );
            if (syncedCandidate) {
              return {
                syncedLyrics: syncedCandidate.syncedLyrics,
                plainLyrics: syncedCandidate.plainLyrics || null,
                source: 'lrclib',
              };
            }

            const plainCandidate = results.find(
              (r) => r.plainLyrics && this.isArtistMatch(r.artistName, art) && this.isTitleMatch(r.trackName, title)
            );
            if (plainCandidate) {
              return {
                syncedLyrics: null,
                plainLyrics: plainCandidate.plainLyrics,
                source: 'lrclib',
              };
            }
          }
        }
      } catch {}
    }

    // 2. Direct GET without and with duration
    for (const art of artistVariants) {
      try {
        const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
          art
        )}&track_name=${encodeURIComponent(title)}`;
        const res = await fetch(getUrl, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data: any = await res.json();
          if (data && (data.syncedLyrics || data.plainLyrics)) {
            if (this.isArtistMatch(data.artistName, art) && this.isTitleMatch(data.trackName, title)) {
              return {
                syncedLyrics: data.syncedLyrics || null,
                plainLyrics: data.plainLyrics || null,
                source: 'lrclib',
              };
            }
          }
        }
      } catch {}

      if (durationSeconds && durationSeconds > 0) {
        try {
          const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
            art
          )}&track_name=${encodeURIComponent(title)}&duration=${Math.round(durationSeconds)}`;
          const res = await fetch(getUrl, {
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const data: any = await res.json();
            if (data && (data.syncedLyrics || data.plainLyrics)) {
              if (this.isArtistMatch(data.artistName, art) && this.isTitleMatch(data.trackName, title)) {
                return {
                  syncedLyrics: data.syncedLyrics || null,
                  plainLyrics: data.plainLyrics || null,
                  source: 'lrclib',
                };
              }
            }
          }
        } catch {}
      }
    }

    // 3. Search query fallback with multiple variations
    const queries = [
      `${artist} ${title}`.trim(),
      rawArtist && rawArtist !== artist ? `${rawArtist} ${title}`.trim() : null,
    ].filter(Boolean) as string[];

    for (const q of queries) {
      try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(searchUrl, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
          const results = (await res.json()) as any[];
          if (Array.isArray(results) && results.length > 0) {
            // STRICT ARTIST MATCH REQUIRED: Never accept unrelated artists!
            const validCandidates = results.filter(
              (r) =>
                (r.syncedLyrics || r.plainLyrics) &&
                this.isArtistMatch(r.artistName, artist) &&
                this.isTitleMatch(r.trackName, title)
            );

            if (validCandidates.length > 0) {
              const isTargetKorean =
                /[\uac00-\ud7a3]/.test(artist || '') || /[\uac00-\ud7a3]/.test(title || '');

              validCandidates.sort((a, b) => {
                let scoreA = 0;
                let scoreB = 0;

                // Heavily favor synced lyrics!
                if (a.syncedLyrics) scoreA += 50;
                if (b.syncedLyrics) scoreB += 50;

                if (this.isArtistMatch(a.artistName, artist)) scoreA += 25;
                if (this.isArtistMatch(b.artistName, artist)) scoreB += 25;

                if (this.isTitleMatch(a.trackName, title)) scoreA += 20;
                if (this.isTitleMatch(b.trackName, title)) scoreB += 20;

                if (isTargetKorean) {
                  if (/[\uac00-\ud7a3]/.test(a.syncedLyrics || a.plainLyrics || '')) scoreA += 10;
                  if (/[\uac00-\ud7a3]/.test(b.syncedLyrics || b.plainLyrics || '')) scoreB += 10;
                }

                if (durationSeconds && durationSeconds > 0) {
                  const diffA = Math.abs((a.duration || 0) - durationSeconds);
                  const diffB = Math.abs((b.duration || 0) - durationSeconds);
                  if (diffA <= 5) scoreA += 10;
                  if (diffB <= 5) scoreB += 10;
                  scoreA -= diffA * 0.05;
                  scoreB -= diffB * 0.05;
                }

                return scoreB - scoreA;
              });

              const best = validCandidates[0];
              return {
                syncedLyrics: best.syncedLyrics || null,
                plainLyrics: best.plainLyrics || null,
                source: 'lrclib',
              };
            }
          }
        }
      } catch {}
    }

    return null;
  }
}


