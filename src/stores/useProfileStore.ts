import { create } from 'zustand';
import { UserSyncService } from '@/services/userSyncService';

function pathBasename(p: string): string {
  if (!p) return '';
  const clean = p.replace(/\\/g, '/');
  const parts = clean.split('/');
  return parts[parts.length - 1] || '';
}

/** Convert a raw disk path to a local-image:// URL that Electron's protocol handler can serve. */
function toLocalImageUrl(p: string): string {
  if (!p) return p;
  // Already normalized
  if (p.startsWith('local-image://') || p.startsWith('http')) return p;
  // Strip any existing file:// prefix
  const clean = p.replace(/^file:\/\/\/?/, '').replace(/\\/g, '/');
  return `local-image://${clean}`;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  country: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  favoriteGenres: string[];
  favoriteArtists: string[];
  favoriteAlbumIds: string[];
  favoriteSongIds: string[];
  joinDate: number;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  /** IDs of users this profile follows */
  following: string[];
  /** IDs of users following this profile */
  followers: string[];
  /** Public playlist IDs */
  publicPlaylistIds: string[];
}

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  isVerified: boolean;
  followersCount: number;
  publicPlaylistIds: string[];
}

interface ProfileState {
  profile: UserProfile | null;
  knownUsers: SocialUser[];
  isLoading: boolean;
  activeUserId: string | null;

  loadProfile: (userId?: string | null) => Promise<void>;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatar: (path: string | null) => Promise<void>;
  updateBanner: (path: string | null) => Promise<void>;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  isFollowing: (userId: string) => boolean;
  searchUsers: (query: string) => SocialUser[];
}

const DEFAULT_PROFILE: UserProfile = {
  id: `user_${Date.now()}`,
  username: 'me',
  displayName: 'LocalSpo User',
  bio: '',
  country: '',
  avatarUrl: null,
  bannerUrl: null,
  favoriteGenres: [],
  favoriteArtists: [],
  favoriteAlbumIds: [],
  favoriteSongIds: [],
  joinDate: Date.now(),
  isVerified: false,
  followersCount: 0,
  followingCount: 0,
  following: [],
  followers: [],
  publicPlaylistIds: [],
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  knownUsers: [],
  isLoading: false,
  activeUserId: null,

  loadProfile: async (userId?: string | null) => {
    const targetUserId = userId !== undefined ? userId : get().activeUserId;
    set({ activeUserId: targetUserId, isLoading: true });

    if (!targetUserId) {
      set({ profile: null, isLoading: false });
      return;
    }

    try {
      const data = await UserSyncService.readData<{ profile?: UserProfile }>(
        targetUserId,
        'profile'
      );
      if (data && data.profile) {
        set({ profile: { ...DEFAULT_PROFILE, ...data.profile } });
      } else {
        set({ profile: { ...DEFAULT_PROFILE, id: targetUserId } });
      }
    } catch {
      set({ profile: { ...DEFAULT_PROFILE, id: targetUserId } });
    } finally {
      set({ isLoading: false });
    }
  },

  saveProfile: async (updates) => {
    const { activeUserId } = get();
    const current = get().profile ?? DEFAULT_PROFILE;
    const updated = { ...current, ...updates };
    set({ profile: updated });
    try {
      await UserSyncService.writeData(activeUserId, 'profile', { profile: updated });
    } catch (err) {
      console.error('[ProfileStore] Failed to save profile:', err);
    }
  },

  updateAvatar: async (inputPath) => {
    if (!inputPath) {
      await get().saveProfile({ avatarUrl: null });
      return;
    }
    let relPath: string | null = null;
    if (window.electronAPI?.profile?.uploadAvatar) {
      relPath = await window.electronAPI.profile.uploadAvatar(inputPath);
    }
    const finalUrl = relPath
      ? `profile/${pathBasename(relPath)}?t=${Date.now()}`
      : inputPath.startsWith('http') || inputPath.startsWith('data:')
      ? inputPath
      : toLocalImageUrl(inputPath);
    await get().saveProfile({ avatarUrl: finalUrl });
  },

  updateBanner: async (inputPath) => {
    if (!inputPath) {
      await get().saveProfile({ bannerUrl: null });
      return;
    }
    let relPath: string | null = null;
    if (window.electronAPI?.profile?.uploadBanner) {
      relPath = await window.electronAPI.profile.uploadBanner(inputPath);
    }
    const finalUrl = relPath
      ? `profile/${pathBasename(relPath)}?t=${Date.now()}`
      : inputPath.startsWith('http') || inputPath.startsWith('data:')
      ? inputPath
      : toLocalImageUrl(inputPath);
    await get().saveProfile({ bannerUrl: finalUrl });
  },

  followUser: (userId) => {
    const profile = get().profile;
    if (!profile || profile.following.includes(userId)) return;
    const following = [...profile.following, userId];
    get().saveProfile({ following, followingCount: following.length });
  },

  unfollowUser: (userId) => {
    const profile = get().profile;
    if (!profile) return;
    const following = profile.following.filter((id) => id !== userId);
    get().saveProfile({ following, followingCount: following.length });
  },

  isFollowing: (userId) => {
    return get().profile?.following.includes(userId) ?? false;
  },

  searchUsers: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().knownUsers;
    return get().knownUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q),
    );
  },
}));
