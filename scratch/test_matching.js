function cleanTitle(title, artistName) {
  if (!title) return '';
  let t = title.trim();

  if (artistName && t.toLowerCase().startsWith(artistName.toLowerCase() + ' - ')) {
    t = t.slice(artistName.length + 3).trim();
  }

  t = t
    .replace(/^["'“”„](.*)["'“”„]$/, '$1')
    .replace(/["'“”„]/g, '')
    .replace(/\[(MV|M\/V|Official Video|Official Audio|Lyric Video|Audio|Lyrics|Performance Video)\]/gi, '')
    .replace(/\((Official Video|Official Audio|Lyric Video|Audio|M\/V|MV|Lyrics|Performance Video)\)/gi, '')
    .replace(/\((.*?)(ver|version|remix|mix|edit|acoustic|live|instrumental|speed|slowed)(.*?)\)/gi, '')
    .replace(/\[(.*?)(ver|version|remix|mix|edit|acoustic|live|instrumental|speed|slowed)(.*?)\]/gi, '')
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\[feat\..*?\]/gi, '')
    .replace(/feat\..*$/gi, '')
    .replace(/ft\..*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

function normalizeStr(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritical marks
    .replace(/[^a-z0-9\s]/g, '') // remove non-alphanumeric except spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function isTitleMatch(candidateTitle, targetTitle) {
  if (!candidateTitle || !targetTitle) return false;

  const cClean = cleanTitle(candidateTitle);
  const tClean = cleanTitle(targetTitle);

  const cNorm = normalizeStr(cClean);
  const tNorm = normalizeStr(tClean);

  if (cNorm === tNorm) return true;

  // Word token matching
  const cWords = cNorm.split(' ').filter(w => w.length > 0);
  const tWords = tNorm.split(' ').filter(w => w.length > 0);

  if (cWords.length === 0 || tWords.length === 0) return false;

  const filterIgnored = (words) => words.filter(w => !['live', 'remix', 'version', 'acoustic', 'edit', 'audio', 'video', 'instrumental', 'ver', 'rock'].includes(w));
  
  const cCore = filterIgnored(cWords);
  const tCore = filterIgnored(tWords);

  if (cCore.join(' ') === tCore.join(' ')) return true;

  if (cCore.length === tCore.length) {
    return cCore.every((w, i) => w === tCore[i]);
  }

  return false;
}

console.log('--- UPDATED TITLE MATCH TESTS ---');
console.log('Iconic Hearts vs Iconic:', isTitleMatch('Iconic', 'Iconic Hearts')); // false
console.log('Iconic Hearts vs Iconic Hearts:', isTitleMatch('Iconic Hearts', 'Iconic Hearts')); // true
console.log('HEARTS vs Heart Shaker:', isTitleMatch('Heart Shaker', 'HEARTS')); // false
console.log('HEARTS vs Queen of Hearts:', isTitleMatch('Queen of Hearts', 'HEARTS')); // false
console.log('ICONIC vs ICONIC (Official Video):', isTitleMatch('ICONIC (Official Video)', 'ICONIC')); // true
console.log('ICONIC vs ICONIC:', isTitleMatch('ICONIC', 'ICONIC')); // true
console.log('Whiplash vs Whiplash (Rock Ver.):', isTitleMatch('Whiplash (Rock Ver.)', 'Whiplash')); // true
