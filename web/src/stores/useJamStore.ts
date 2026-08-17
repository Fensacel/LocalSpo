import { create } from 'zustand';
import type { JamRoom, Track, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface JamStore {
  room: JamRoom | null;
  loading: boolean;
  createRoom: (host: Profile) => Promise<string>;
  joinRoom: (roomId: string, user: Profile) => Promise<void>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
  updateTrack: (roomId: string, track: Track) => Promise<void>;
  updatePlayState: (roomId: string, isPlaying: boolean, currentTime: number) => Promise<void>;
  subscribeToRoom: (roomId: string) => () => void;
}

export const useJamStore = create<JamStore>((set) => ({
  room: null,
  loading: false,

  createRoom: async (host) => {
    const { data } = await supabase
      .from('jam_rooms')
      .insert({
        host_id: host.id,
        participants: [host.id],
        queue: [],
        is_playing: false,
        current_time: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    const room: JamRoom = {
      id: data.id,
      hostId: host.id,
      host,
      participants: [host],
      queue: [],
      isPlaying: false,
      currentTime: 0,
      createdAt: data.created_at,
    };
    set({ room });
    return data.id as string;
  },

  joinRoom: async (roomId, user) => {
    const { data } = await supabase
      .from('jam_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!data) throw new Error('Room not found');

    const participants = data.participants || [];
    if (!participants.includes(user.id)) {
      await supabase
        .from('jam_rooms')
        .update({ participants: [...participants, user.id] })
        .eq('id', roomId);
    }

    set({
      room: {
        id: data.id,
        hostId: data.host_id,
        participants: [user],
        queue: data.queue || [],
        isPlaying: data.is_playing,
        currentTime: data.current_time,
        createdAt: data.created_at,
      },
    });
  },

  leaveRoom: async (roomId, userId) => {
    const { data } = await supabase.from('jam_rooms').select('participants').eq('id', roomId).single();
    if (data) {
      const remaining = (data.participants || []).filter((id: string) => id !== userId);
      if (remaining.length === 0) {
        await supabase.from('jam_rooms').delete().eq('id', roomId);
      } else {
        await supabase.from('jam_rooms').update({ participants: remaining }).eq('id', roomId);
      }
    }
    set({ room: null });
  },

  updateTrack: async (roomId, track) => {
    await supabase.from('jam_rooms').update({
      current_track: track,
      current_time: 0,
      is_playing: true,
    }).eq('id', roomId);
  },

  updatePlayState: async (roomId, isPlaying, currentTime) => {
    await supabase.from('jam_rooms').update({ is_playing: isPlaying, current_time: currentTime }).eq('id', roomId);
  },

  subscribeToRoom: (roomId) => {
    const channel = supabase
      .channel(`jam:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jam_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const d = payload.new;
          set((s) => ({
            room: s.room
              ? {
                  ...s.room,
                  currentTrack: d.current_track,
                  isPlaying: d.is_playing,
                  currentTime: d.current_time,
                  queue: d.queue || [],
                }
              : null,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
