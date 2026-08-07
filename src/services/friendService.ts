import { supabase } from '@/lib/supabase';
import type { UserProfile } from './profileService';

export interface FriendRelationship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export class FriendService {
  /** Toggle Follow (Follow/Unfollow) using exact Supabase columns (sender_id, receiver_id) */
  public static async toggleFollow(userId: string, targetId: string): Promise<boolean> {
    if (!userId || !targetId || userId === targetId) return false;
    try {
      // Check if already following
      const { data: existing, error: selectErr } = await supabase
        .from('friends')
        .select('id')
        .eq('sender_id', userId)
        .eq('receiver_id', targetId)
        .maybeSingle();

      if (selectErr) {
        console.error('[FriendService] check follow error:', selectErr);
      }

      if (existing) {
        // Unfollow
        const { error: delErr } = await supabase.from('friends').delete().eq('id', existing.id);
        if (delErr) console.error('[FriendService] unfollow error:', delErr);
        return false; // Now not following
      } else {
        // Follow with explicit client UUID
        const followId = crypto.randomUUID();
        const { error: insErr } = await supabase.from('friends').insert({
          id: followId,
          sender_id: userId,
          receiver_id: targetId,
          status: 'accepted',
          created_at: new Date().toISOString(),
        });

        if (insErr) {
          console.error('[FriendService] follow insert error:', insErr);
          return false;
        }
        return true; // Now following
      }
    } catch (err) {
      console.error('[FriendService] toggleFollow exception:', err);
      return false;
    }
  }

  /** Get list of user IDs that current user is following (receiver_id where sender_id = userId) */
  public static async getFollowingIds(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('receiver_id')
        .eq('sender_id', userId);

      if (error) {
        console.error('[FriendService] getFollowingIds error:', error);
        return [];
      }
      return data ? data.map((d) => d.receiver_id) : [];
    } catch (err) {
      console.error('[FriendService] getFollowingIds exception:', err);
      return [];
    }
  }

  /** Get list of user IDs that follow current user (sender_id where receiver_id = userId) */
  public static async getFollowerIds(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('sender_id')
        .eq('receiver_id', userId);

      if (error) {
        console.error('[FriendService] getFollowerIds error:', error);
        return [];
      }
      return data ? data.map((d) => d.sender_id) : [];
    } catch (err) {
      console.error('[FriendService] getFollowerIds exception:', err);
      return [];
    }
  }

  /** Get mutual friends profiles (Saling Follow) */
  public static async getMutualFriendsProfiles(userId: string): Promise<UserProfile[]> {
    if (!userId) return [];
    try {
      // 1. Get users I follow
      const followingIds = await this.getFollowingIds(userId);
      if (followingIds.length === 0) return [];

      // 2. Find users from followingIds who also follow me back
      const { data: followBack, error } = await supabase
        .from('friends')
        .select('sender_id')
        .eq('receiver_id', userId)
        .in('sender_id', followingIds);

      if (error || !followBack || followBack.length === 0) return [];
      const mutualIds = followBack.map((f) => f.sender_id);

      // 3. Fetch profiles for mutual friends
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', mutualIds);

      return (profiles as UserProfile[]) || [];
    } catch (err) {
      console.error('[FriendService] getMutualFriendsProfiles exception:', err);
      return [];
    }
  }
}
