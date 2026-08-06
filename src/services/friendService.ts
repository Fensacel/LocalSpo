import { supabase } from '@/lib/supabase';
import type { UserProfile } from './profileService';

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendRelationship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendStatus;
  created_at: string;
  sender?: UserProfile;
  receiver?: UserProfile;
}

export class FriendService {
  /** Send friend request */
  public static async sendFriendRequest(senderId: string, receiverId: string): Promise<{ success: boolean; error?: string }> {
    if (senderId === receiverId) return { success: false, error: 'Cannot send friend request to yourself' };

    try {
      const { error } = await supabase.from('friends').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send friend request' };
    }
  }

  /** Accept friend request */
  public static async acceptFriendRequest(relationshipId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', relationshipId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to accept friend request' };
    }
  }

  /** Reject or cancel friend request */
  public static async removeFriend(relationshipId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('friends').delete().eq('id', relationshipId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to remove friend' };
    }
  }

  /** Add friend directly */
  public static async addFriend(userId: string, friendId: string): Promise<boolean> {
    if (!userId || !friendId || userId === friendId) return false;
    try {
      const { data: existing } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
        .maybeSingle();

      if (existing) {
        if (existing.status !== 'accepted') {
          await supabase.from('friends').update({ status: 'accepted' }).eq('id', existing.id);
        }
        return true;
      }

      const { error } = await supabase.from('friends').insert({
        user_id: userId,
        friend_id: friendId,
        status: 'accepted',
      });

      if (error) {
        console.error('[FriendService] addFriend error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[FriendService] addFriend exception:', err);
      return false;
    }
  }

  /** Remove friend */
  public static async removeFriendByUsers(userId: string, friendId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

      return !error;
    } catch (err) {
      console.error('[FriendService] removeFriend exception:', err);
      return false;
    }
  }

  /** Get list of friend UserProfiles */
  public static async getFriendsProfiles(userId: string): Promise<UserProfile[]> {
    try {
      const { data: rels } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (!rels || rels.length === 0) return [];

      const friendIds = rels.map((r) => (r.user_id === userId ? r.friend_id : r.user_id));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      return (profiles as UserProfile[]) || [];
    } catch (err) {
      console.error('[FriendService] getFriendsProfiles error:', err);
      return [];
    }
  }
}
