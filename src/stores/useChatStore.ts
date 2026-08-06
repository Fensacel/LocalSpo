import { create } from 'zustand';
import { FriendService } from '@/services/friendService';
import type { UserProfile } from '@/services/profileService';

interface ChatStoreState {
  hasUnread: boolean;
  unreadCount: number;
  friends: UserProfile[];
  friendIds: string[];
  isLoadingFriends: boolean;

  setHasUnread: (hasUnread: boolean) => void;
  clearUnread: () => void;
  fetchFriends: (userId: string) => Promise<void>;
  toggleFriend: (userId: string, friendId: string) => Promise<boolean>;
  isFriend: (friendId: string) => boolean;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  hasUnread: false,
  unreadCount: 0,
  friends: [],
  friendIds: [],
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
      const friends = await FriendService.getFriendsProfiles(userId);
      const friendIds = friends.map((f) => f.id);
      set({ friends, friendIds, isLoadingFriends: false });
    } catch (err) {
      console.error('[useChatStore] fetchFriends error:', err);
      set({ isLoadingFriends: false });
    }
  },

  toggleFriend: async (userId, friendId) => {
    if (!userId || !friendId) return false;
    const isCurrentlyFriend = get().friendIds.includes(friendId);

    if (isCurrentlyFriend) {
      const success = await FriendService.removeFriendByUsers(userId, friendId);
      if (success) {
        set((state) => ({
          friends: state.friends.filter((f) => f.id !== friendId),
          friendIds: state.friendIds.filter((id) => id !== friendId),
        }));
        return false;
      }
    } else {
      const success = await FriendService.addFriend(userId, friendId);
      if (success) {
        get().fetchFriends(userId);
        return true;
      }
    }
    return isCurrentlyFriend;
  },

  isFriend: (friendId) => get().friendIds.includes(friendId),
}));
