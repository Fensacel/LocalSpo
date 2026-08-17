import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePlayerStore, useToastStore, useLibraryStore } from '@/stores';
import { useProfileStore } from '@/stores/useProfileStore';
import type { Song } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface JamParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
  joinedAt: number;
}

interface JamState {
  jamCode: string | null;
  isHost: boolean;
  hostName: string | null;
  participants: JamParticipant[];
  channel: RealtimeChannel | null;
  isConnecting: boolean;

  // Actions
  createJamSession: () => Promise<string | null>;
  joinJamSession: (code: string) => Promise<boolean>;
  leaveJamSession: () => void;
  broadcastPlayback: (song: Song | null, isPlaying: boolean, currentTime: number) => void;
  broadcastQueueSong: (song: Song) => void;
}

export const useJamStore = create<JamState>((set, get) => ({
  jamCode: null,
  isHost: false,
  hostName: null,
  participants: [],
  channel: null,
  isConnecting: false,

  createJamSession: async () => {
    if (!isSupabaseConfigured) {
      useToastStore.getState().showToast('Supabase belum dikonfigurasi untuk Jam Session', 'error');
      return null;
    }

    set({ isConnecting: true });
    const profile = useProfileStore.getState().profile;
    const username = profile?.username || 'Host';
    const displayName = profile?.displayName || 'Host User';
    const avatarUrl = profile?.avatarUrl || undefined;

    // Generate random 6-character Jam Code
    const randomCode = 'JAM-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    try {
      const channelName = `jam_room_${randomCode}`;
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: profile?.id || username },
        },
      });

      const meParticipant: JamParticipant = {
        id: profile?.id || username,
        username,
        displayName,
        avatarUrl,
        isHost: true,
        joinedAt: Date.now(),
      };

      // Listen for broadcast events
      channel
        .on('broadcast', { event: 'request_state' }, () => {
          // New member joined, host sends current state
          const player = usePlayerStore.getState();
          get().broadcastPlayback(player.currentSong, player.isPlaying, player.currentTime);
        })
        .on('broadcast', { event: 'add_queue' }, ({ payload }) => {
          if (payload?.song) {
            usePlayerStore.getState().addToQueue(payload.song);
            useToastStore.getState().showToast(`✨ ${payload.senderName || 'Member'} menambahkan "${payload.song.title}" ke Jam Queue`, 'info');
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const pList: JamParticipant[] = [];
          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.user) pList.push(p.user);
            });
          });
          set({ participants: pList.length > 0 ? pList : [meParticipant] });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user: meParticipant });
            set({
              jamCode: randomCode,
              isHost: true,
              hostName: displayName,
              participants: [meParticipant],
              channel,
              isConnecting: false,
            });
            useToastStore.getState().showToast(`Sesi Jam dibuat: ${randomCode}`, 'success');
          }
        });

      return randomCode;
    } catch (err) {
      console.error('[JamSession] Create error:', err);
      set({ isConnecting: false });
      useToastStore.getState().showToast('Gagal membuat Sesi Jam', 'error');
      return null;
    }
  },

  joinJamSession: async (codeInput: string) => {
    if (!isSupabaseConfigured) {
      useToastStore.getState().showToast('Supabase belum dikonfigurasi untuk Jam Session', 'error');
      return false;
    }

    const cleanCode = codeInput.trim().toUpperCase();
    if (!cleanCode) return false;

    // Leave any existing Jam session
    get().leaveJamSession();

    set({ isConnecting: true });
    const profile = useProfileStore.getState().profile;
    const username = profile?.username || `Guest_${Math.floor(Math.random() * 1000)}`;
    const displayName = profile?.displayName || username;
    const avatarUrl = profile?.avatarUrl || undefined;

    try {
      const channelName = `jam_room_${cleanCode}`;
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: profile?.id || username },
        },
      });

      const meParticipant: JamParticipant = {
        id: profile?.id || username,
        username,
        displayName,
        avatarUrl,
        isHost: false,
        joinedAt: Date.now(),
      };

      channel
        .on('broadcast', { event: 'playback_sync' }, ({ payload }) => {
          if (!payload) return;
          const { song, isPlaying, currentTime } = payload;
          const player = usePlayerStore.getState();

          if (song) {
            if (song.sourceType === 'streaming') {
              useLibraryStore.getState().addStreamSong(song);
            }
            if (player.currentSong?.id !== song.id) {
              player.setQueue([song], 0, `Jam: ${cleanCode}`);
            }
          }

          if (typeof currentTime === 'number' && Math.abs(player.currentTime - currentTime) > 2) {
            player.setCurrentTime(currentTime);
            window.dispatchEvent(new CustomEvent('player:seek', { detail: currentTime }));
          }

          if (typeof isPlaying === 'boolean' && player.isPlaying !== isPlaying) {
            player.setIsPlaying(isPlaying);
            window.dispatchEvent(new CustomEvent('player:toggle'));
          }
        })
        .on('broadcast', { event: 'add_queue' }, ({ payload }) => {
          if (payload?.song) {
            usePlayerStore.getState().addToQueue(payload.song);
            useToastStore.getState().showToast(`✨ ${payload.senderName || 'Member'} menambahkan "${payload.song.title}" ke Jam Queue`, 'info');
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const pList: JamParticipant[] = [];
          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.user) pList.push(p.user);
            });
          });
          set({ participants: pList.length > 0 ? pList : [meParticipant] });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user: meParticipant });
            set({
              jamCode: cleanCode,
              isHost: false,
              hostName: 'Host',
              participants: [meParticipant],
              channel,
              isConnecting: false,
            });

            // Request current state from host
            channel.send({
              type: 'broadcast',
              event: 'request_state',
              payload: { participant: meParticipant },
            });

            useToastStore.getState().showToast(`Berhasil bergabung ke Sesi Jam: ${cleanCode}`, 'success');
          }
        });

      return true;
    } catch (err) {
      console.error('[JamSession] Join error:', err);
      set({ isConnecting: false });
      useToastStore.getState().showToast('Gagal bergabung ke Sesi Jam', 'error');
      return false;
    }
  },

  leaveJamSession: () => {
    const { channel, jamCode } = get();
    if (channel) {
      channel.untrack();
      supabase.removeChannel(channel);
    }
    if (jamCode) {
      useToastStore.getState().showToast('Keluar dari Sesi Jam', 'info');
    }
    set({
      jamCode: null,
      isHost: false,
      hostName: null,
      participants: [],
      channel: null,
      isConnecting: false,
    });
  },

  broadcastPlayback: (song, isPlaying, currentTime) => {
    const { channel, jamCode } = get();
    if (!channel || !jamCode) return;

    channel.send({
      type: 'broadcast',
      event: 'playback_sync',
      payload: {
        song,
        isPlaying,
        currentTime,
        timestamp: Date.now(),
      },
    });
  },

  broadcastQueueSong: (song) => {
    const { channel, jamCode } = get();
    if (!channel || !jamCode) return;
    const profile = useProfileStore.getState().profile;

    channel.send({
      type: 'broadcast',
      event: 'add_queue',
      payload: {
        song,
        senderName: profile?.displayName || profile?.username || 'Member',
      },
    });
  },
}));
