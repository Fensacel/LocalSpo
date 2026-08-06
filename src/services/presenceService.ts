import { supabase } from '@/lib/supabase';

export interface UserPresence {
  user_id: string;
  song_id: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  updated_at: string;
}

export class PresenceService {
  /** Update user's Now Playing presence */
  public static async updatePresence(
    userId: string,
    track: { song_id: string; title: string; artist: string; album?: string } | null,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('presence').upsert({
        user_id: userId,
        song_id: track?.song_id || null,
        title: track?.title || null,
        artist: track?.artist || null,
        album: track?.album || null,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch (err) {
      console.error('[PresenceService] updatePresence error:', err);
      return false;
    }
  }

  /** Get user presence */
  public static async getPresence(userId: string): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase
        .from('presence')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error || !data) return null;
      return data as UserPresence;
    } catch {
      return null;
    }
  }
}
