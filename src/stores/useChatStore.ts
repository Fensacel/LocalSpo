import { create } from 'zustand';
import { FriendService } from '@/services/friendService';
import type { UserProfile } from '@/services/profileService';

interface ChatStoreState {
  hasUnread: boolean;
  unreadCount: number;
  friends: UserProfile[]; // Mutual Friends (Saling Follow)
  followingIds: string[];
  followerIds: string[];
  isLoadingFriends: boolean;

  setHasUnread: (hasUnread: boolean) => void;
  clearUnread: () => void;
  fetchFriends: (userId: string) => Promise<void>;
  toggleFollow: (userId: string, targetId: string) => Promise<boolean>;
  isFollowing: (targetId: string) => boolean;
  isMutualFriend: (targetId: string) => boolean;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  hasUnread: false,
  unreadCount: 0,
  friends: [],
  followingIds: [],
  followerIds: [],
  isLoadingFriends: false,

  setHasUnread: (hasUnread) =>
    set((state) => ({
      hasUnread,
      unreadCount: hasUnread ? state.unreadCount + 1 : 0,
    })),

  clearUnread: () => set({ hasUnread: false, unreadCount: 0 }),

  fetchFriends: async (userId) => {
    if (!userId) return;
    set({ isLoadingFriends: true });
    try {
      const [friends, followingIds, followerIds] = await Promise.all([
        FriendService.getMutualFriendsProfiles(userId),
        FriendService.getFollowingIds(userId),
        FriendService.getFollowerIds(userId),
      ]);
      set({ friends, followingIds, followerIds, isLoadingFriends: false });
    } catch (err) {
      console.error('[useChatStore] fetchFriends error:', err);
      set({ isLoadingFriends: false });
    }
  },

  toggleFollow: async (userId, targetId) => {
    if (!userId || !targetId) return false;
    const currentlyFollowing = get().followingIds.includes(targetId);

    if (currentlyFollowing) {
      // Optimistically unfollow
      set((state) => ({
        followingIds: state.followingIds.filter((id) => id !== targetId),
        friends: state.friends.filter((f) => f.id !== targetId),
      }));
      await FriendService.toggleFollow(userId, targetId);
      get().fetchFriends(userId);
      return false;
    } else {
      // Optimistically follow
      set((state) => ({
        followingIds: [...state.followingIds, targetId],
      }));
      await FriendService.toggleFollow(userId, targetId);
      get().fetchFriends(userId);
      return true;
    }
  },

  isFollowing: (targetId) => get().followingIds.includes(targetId),
  isMutualFriend: (targetId) => get().followingIds.includes(targetId) && get().followerIds.includes(targetId),
}));
