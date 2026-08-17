async function test() {
  const songs = [
    { artist: 'aespa', title: 'ICONIC' },
    { artist: 'TWICE', title: 'HEARTS' },
    { artist: 'aespa', title: 'Hearts' },
    { artist: 'ITZY', title: 'ICONIC' }
  ];

  for (const s of songs) {
    console.log(`\n=== Testing ${s.artist} - ${s.title} ===`);
    
    // LRCLIB get
    try {
      const res = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(s.artist)}&track_name=${encodeURIComponent(s.title)}`);
      if (res.ok) {
        const data = await res.json();
        console.log('[LRCLIB GET]', { trackName: data.trackName, artistName: data.artistName, hasSynced: !!data.syncedLyrics, sample: (data.syncedLyrics || data.plainLyrics || '').slice(0, 100) });
      } else {
        console.log('[LRCLIB GET]', res.status);
      }
    } catch (e) {
      console.log('[LRCLIB GET err]', e.message);
    }

    // LRCLIB search
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${s.artist} ${s.title}`)}`);
      if (res.ok) {
        const list = await res.json();
        console.log('[LRCLIB SEARCH count]', list.length);
        if (list.length > 0) {
          console.log('[LRCLIB SEARCH first 3]', list.slice(0, 3).map(r => ({ trackName: r.trackName, artistName: r.artistName, duration: r.duration, hasSynced: !!r.syncedLyrics, sample: (r.syncedLyrics||'').slice(0, 60) })));
        }
      }
    } catch (e) {
      console.log('[LRCLIB SEARCH err]', e.message);
    }

    // NetEase search
    try {
      const res = await fetch(`https://music.163.com/api/search/get?s=${encodeURIComponent(`${s.artist} ${s.title}`)}&type=1&limit=5`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await res.json();
        const songs = data?.result?.songs || [];
        console.log('[NetEase SEARCH count]', songs.length);
        for (const song of songs.slice(0, 3)) {
          console.log(' - NetEase hit:', song.id, song.name, song.artists?.map(a => a.name));
        }
      }
    } catch (e) {
      console.log('[NetEase err]', e.message);
    }
  }
}

test();
