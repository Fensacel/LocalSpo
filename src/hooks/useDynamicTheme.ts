/**
 * useDynamicTheme.ts
 *
 * Extracts a dominant color from the current song's album art using
 * color-thief-browser and applies a dynamic accent/gradient theme
 * to the document root CSS variables.
 *
 * Mount once at app root (App.tsx).
 * Reads only from the player store — no new state.
 */

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getImageUrl } from '@/utils';

// ─── Helpers ───────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/** Darken a color by a factor (0-1) */
function darken(r: number, g: number, b: number, factor: number): [number, number, number] {
  return [
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  ];
}

/** Ensure the color has minimum vibrancy/saturation */
function ensureVibrancy(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  // If nearly grayscale, add a slight blue tint
  if (saturation < 0.15) {
    return [Math.min(255, r + 20), Math.min(255, g + 20), Math.min(255, b + 60)];
  }
  return [r, g, b];
}

// ─── CSS Variable Application ──────────────────────────

function applyTheme(r: number, g: number, b: number): void {
  const root = document.documentElement;

  const [vr, vg, vb] = ensureVibrancy(r, g, b);
  const accent = rgbToHex(vr, vg, vb);
  const [dr, dg, db] = darken(vr, vg, vb, 0.35);
  const accentDark = rgbToHex(dr, dg, db);
  const [d2r, d2g, d2b] = darken(vr, vg, vb, 0.65);
  const accentDeep = rgbToHex(d2r, d2g, d2b);

  const lum = luminance(vr, vg, vb);
  const textColor = lum > 0.4 ? '#0a0a0a' : '#ffffff';

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-dark', accentDark);
  root.style.setProperty('--accent-deep', accentDeep);
  root.style.setProperty('--accent-rgb', `${vr},${vg},${vb}`);
  root.style.setProperty('--accent-text', textColor);
  root.style.setProperty(
    '--accent-gradient',
    `linear-gradient(135deg, ${accentDeep} 0%, ${accentDark} 50%, ${accent}22 100%)`,
  );
  root.style.setProperty('--player-glow', `0 0 40px ${accent}40`);
  root.style.setProperty('--sidebar-accent', `${accent}15`);
}

function resetTheme(): void {
  const root = document.documentElement;
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-dark');
  root.style.removeProperty('--accent-deep');
  root.style.removeProperty('--accent-rgb');
  root.style.removeProperty('--accent-text');
  root.style.removeProperty('--accent-gradient');
  root.style.removeProperty('--player-glow');
  root.style.removeProperty('--sidebar-accent');
}

// ─── Color extraction ──────────────────────────────────

async function extractColor(src: string): Promise<[number, number, number] | null> {
  try {
    // Dynamically import color-thief-browser to avoid SSR issues
    const { default: ColorThief } = await import('color-thief-browser');
    const ct = new ColorThief();

    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const color = ct.getColor(img);
          resolve(color as [number, number, number]);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      // Cache-bust to avoid CORS issues with cached images
      img.src = src + (src.includes('?') ? '&_cb=1' : '');
    });
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────

export function useDynamicTheme(): void {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentSong) {
      resetTheme();
      lastSongIdRef.current = null;
      return;
    }

    // Don't re-extract for same song
    if (currentSong.id === lastSongIdRef.current) return;
    lastSongIdRef.current = currentSong.id;

    // Song uses coverPath (local) or remoteCoverUrl (streaming)
    const rawCover = currentSong.remoteCoverUrl || currentSong.coverPath || null;
    const coverSrc = rawCover ? (getImageUrl(rawCover) ?? rawCover) : null;

    if (!coverSrc) {
      resetTheme();
      return;
    }

    let cancelled = false;

    extractColor(coverSrc).then((color) => {
      if (cancelled) return;
      if (color) {
        applyTheme(color[0], color[1], color[2]);
      } else {
        resetTheme();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentSong]);
}
