/**
 * AudioEngine — manages the HTMLAudioElement lifecycle.
 *
 * Critical rules:
 * - NEVER assign coverUrl, album URL, or page URL to audio.src
 * - NEVER use fake/silent audio sources
 * - Only assign valid http(s)/blob URLs from streamService
 * - If stream resolution fails, show error state — do NOT fake playback
 */

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { resolveStream, isValidAudioSrc } from '../../services/streamService';
import type { Track } from '../../types';

export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const setAudioRef = usePlayerStore((s) => s.setAudioRef);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const next = usePlayerStore((s) => s.next);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const volume = usePlayerStore((s) => s.volume);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    setAudioRef(audio);

    // ─── Event handlers ────────────────────────────────────────────────────

    const onLoadStart = () => setPlayerState('loading');
    const onCanPlay = () => setPlayerState('ready');
    const onPlay = () => setPlayerState('playing');
    const onPause = () => setPlayerState('paused');
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        next();
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onWaiting = () => setPlayerState('buffering');
    const onPlaying = () => setPlayerState('playing');

    const onError = () => {
      const err = audio.error;
      const errorMap: Record<number, string> = {
        1: 'Playback aborted',
        2: 'Network error',
        3: 'Decode error',
        4: 'Source not supported',
      };
      const msg = err ? (errorMap[err.code] || 'Unknown audio error') : 'Audio error';
      console.error('[AudioEngine] Error:', msg, {
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
        duration: audio.duration,
        currentTime: audio.currentTime,
        error: err,
      });
      setPlayerState('error');
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);

    // ─── Custom load event from playerStore ────────────────────────────────

    const handleLoad = async (e: Event) => {
      const { track, autoPlay } = (e as CustomEvent<{ track: Track; autoPlay: boolean }>).detail;

      // Pause current if playing
      if (!audio.paused) {
        audio.pause();
      }
      audio.src = '';
      audio.removeAttribute('src');
      audio.load();

      setPlayerState('loading');

      // Resolve stream
      const result = await resolveStream(track);

      if (!result.ok) {
        console.error('[AudioEngine] Stream resolution failed:', result.error, {
          track,
          audioSrc: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState,
          duration: audio.duration,
          currentTime: audio.currentTime,
          error: audio.error,
        });
        setPlayerState('error');
        return;
      }

      const { streamUrl } = result.data;

      // Validate the stream URL
      if (!isValidAudioSrc(streamUrl)) {
        console.error('[AudioEngine] BUG: Invalid stream URL received', {
          track,
          audioSrc: streamUrl,
          readyState: audio.readyState,
          networkState: audio.networkState,
          duration: audio.duration,
          currentTime: audio.currentTime,
          error: audio.error,
        });
        setPlayerState('error');
        return;
      }

      audio.src = streamUrl;
      audio.load();

      if (autoPlay) {
        // Wait for canplay before calling play
        const onReady = () => {
          audio.removeEventListener('canplay', onReady);
          audio.play().catch((err) => {
            console.error('[AudioEngine] autoplay failed:', err);
            setPlayerState('error');
          });
        };
        audio.addEventListener('canplay', onReady);
      }
    };

    audio.addEventListener('lsp:load', handleLoad as EventListener);

    return () => {
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('lsp:load', handleLoad as EventListener);
      audio.pause();
      audio.src = '';
      setAudioRef(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return null;
}
