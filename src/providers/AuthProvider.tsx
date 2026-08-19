import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuthService } from '@/services/authService';
import { ProfileService, type UserProfile } from '@/services/profileService';

import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { useProfileStore } from '@/stores/useProfileStore';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

let lastSyncedUserId: string | null | undefined = undefined;

function syncStoresForUser(userId: string | null) {
  if (lastSyncedUserId === userId) return;
  lastSyncedUserId = userId;

  Promise.all([
    usePlaylistStore.getState().loadPlaylists(userId),
    useHistoryStore.getState().loadHistory(userId),
    useFavoritesStore.getState().loadFavorites(userId),
    useStatsStore.getState().loadStats(userId),
    useProfileStore.getState().loadProfile(userId),
  ]).catch((err) => {
    console.warn('[AuthProvider] syncStoresForUser error:', err);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const loadUserProfile = useCallback(async (authUser: User) => {
    try {
      const userProfile = await ProfileService.ensureProfile(authUser);
      setProfile(userProfile);
      if (userProfile) {
        useProfileStore.getState().saveProfile({
          id: userProfile.id,
          username: userProfile.username,
          displayName: userProfile.display_name,
          bio: userProfile.bio || '',
          avatarUrl: userProfile.avatar_url,
          bannerUrl: userProfile.banner_url,
        });
      }
    } catch (err) {
      console.error('[AuthProvider] loadUserProfile error:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const updated = await ProfileService.getProfile(user.id);
      if (updated) {
        setProfile(updated);
        useProfileStore.getState().saveProfile({
          id: updated.id,
          username: updated.username,
          displayName: updated.display_name,
          bio: updated.bio || '',
          avatarUrl: updated.avatar_url,
          bannerUrl: updated.banner_url,
        });
      }
    }
  }, [user]);

  // Initial session restoration & Auth State Listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        syncStoresForUser(null);
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const initialSession = await AuthService.getSession();
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          const userId = initialSession?.user?.id || null;
          syncStoresForUser(userId);
          if (initialSession?.user) {
            await loadUserProfile(initialSession.user);
          }
        }
      } catch (err: any) {
        console.error('[AuthProvider] initAuth error:', err);
        syncStoresForUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth State changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthProvider] Auth state changed:', event);
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user || null);

      const userId = newSession?.user?.id || null;
      syncStoresForUser(userId);

      if (newSession?.user) {
        await loadUserProfile(newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Listen to Electron Deep Link Callback (localspo://auth/callback)
  useEffect(() => {
    if (!window.electronAPI?.auth?.onDeepLink) return;

    const cleanup = window.electronAPI.auth.onDeepLink(async (deepLinkUrl: string) => {
      console.log('[AuthProvider] Received deep link event:', deepLinkUrl);
      setLoading(true);
      setError(null);

      const { session: newSession, error: deepLinkErr } = await AuthService.handleDeepLink(deepLinkUrl);
      if (deepLinkErr) {
        setError(deepLinkErr);
        setLoading(false);
        return;
      }

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        await loadUserProfile(newSession.user);
      }
      setLoading(false);
    });

    return () => {
      cleanup();
    };
  }, [loadUserProfile]);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: signErr } = await AuthService.signInWithGoogle();
    if (signErr) {
      setError(signErr);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    const { error: outErr } = await AuthService.signOut();
    if (outErr) {
      setError(outErr);
    } else {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signOut: handleSignOut,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
