import { supabase } from '@/lib/supabase';

export interface FollowedPlaylistRecord {
  user_id: string;
  playlist_id: string;
  provider: 'spotify' | 'ytmusic' | 'localspo';
  auto_sync: boolean;
  created_at: string;
}

export class PlaylistFollowService {
  /** Follow a playlist in cloud database */
  public static async followPlaylist(userId: string, playlistId: string, provider: 'spotify' | 'ytmusic' | 'localspo' = 'spotify', autoSync = true): Promise<boolean> {
    try {
      const { error } = await supabase.from('playlist_follow').upsert({
        user_id: userId,
        playlist_id: playlistId,
        provider,
        auto_sync: autoSync,
        created_at: new Date().toISOString(),
      });
      return !error;
    } catch (err) {
      console.error('[PlaylistFollowService] follow error:', err);
      return false;
    }
  }

  /** Unfollow a playlist */
  public static async unfollowPlaylist(userId: string, playlistId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('playlist_follow')
        .delete()
        .eq('user_id', userId)
        .eq('playlist_id', playlistId);
      return !error;
    } catch (err) {
      console.error('[PlaylistFollowService] unfollow error:', err);
      return false;
    }
  }

  /** Get user's cloud followed playlists */
  public static async getUserFollowedPlaylists(userId: string): Promise<FollowedPlaylistRecord[]> {
    try {
      const { data, error } = await supabase
        .from('playlist_follow')
        .select('*')
        .eq('user_id', userId);
      if (error || !data) return [];
      return data as FollowedPlaylistRecord[];
    } catch (err) {
      console.error('[PlaylistFollowService] getUserFollowedPlaylists error:', err);
      return [];
    }
  }
}
