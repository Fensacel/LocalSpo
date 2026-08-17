import { create } from 'zustand';
import type { Profile, DbProfile } from '../types';
import { supabase } from '../lib/supabase';

function dbToProfile(db: DbProfile): Profile {
  return {
    id: db.id,
    username: db.username,
    displayName: db.display_name,
    avatarUrl: db.avatar_url,
    bannerUrl: db.banner_url,
    bio: db.bio,
    country: db.country,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface ProfileStore {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  fetchProfileByUsername: (username: string) => Promise<Profile | null>;
  updateProfile: (userId: string, updates: Partial<DbProfile>) => Promise<void>;
  uploadAvatar: (userId: string, file: File) => Promise<string>;
  uploadBanner: (userId: string, file: File) => Promise<string>;
  ensureProfile: (userId: string, email: string, name?: string, avatarUrl?: string) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ profile: data ? dbToProfile(data as DbProfile) : null, loading: false });
  },

  fetchProfileByUsername: async (username) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    if (error || !data) return null;
    return dbToProfile(data as DbProfile);
  },

  updateProfile: async (userId, updates) => {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    // Re-fetch
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) set({ profile: dbToProfile(data as DbProfile) });
  },

    uploadAvatar: async (userId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust so browser reloads the new image after upload
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);
    // Re-fetch so store stays in sync
    const { data: updated } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (updated) set({ profile: dbToProfile(updated as DbProfile) });
    return publicUrl;
  },

  uploadBanner: async (userId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/banner.${ext}`;
    const { error } = await supabase.storage
      .from('banners')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('banners').getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
    await supabase
      .from('profiles')
      .update({ banner_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);
    // Re-fetch so store stays in sync
    const { data: updated } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (updated) set({ profile: dbToProfile(updated as DbProfile) });
    return publicUrl;
  },

  ensureProfile: async (userId, email, name, avatarUrl) => {
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!data) {
      const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase();
      await supabase.from('profiles').insert({
        id: userId,
        username,
        display_name: name || username,
        avatar_url: avatarUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  },
}));
