import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  created_at?: string;
  updated_at?: string;
  isVerified?: boolean;
}

export class ProfileService {
  /**
   * Fetches user profile by user ID from Supabase
   */
  public static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;
      return data as UserProfile;
    } catch (err) {
      console.error('[ProfileService] getProfile error:', err);
      return null;
    }
  }

  /**
   * Fetches user profile by username from Supabase
   */
  public static async getProfileByUsername(username: string): Promise<UserProfile | null> {
    try {
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error || !data) return null;
      return data as UserProfile;
    } catch (err) {
      console.error('[ProfileService] getProfileByUsername error:', err);
      return null;
    }
  }

  /**
   * Fetches multiple profiles by array of user IDs
   */
  public static async getProfilesByIds(userIds: string[]): Promise<UserProfile[]> {
    if (!userIds || userIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error || !data) return [];
      return data as UserProfile[];
    } catch (err) {
      console.error('[ProfileService] getProfilesByIds error:', err);
      return [];
    }
  }

  /**
   * Ensures a profile exists for the logged in user.
   * If first login, automatically creates a profile with unique username fallback.
   */
  public static async ensureProfile(user: User): Promise<UserProfile> {
    const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'user';
    const baseUsername = rawName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'user';

    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const email = user.email || '';
    const displayName = rawName;

    const fallbackProfile: UserProfile = {
      id: user.id,
      username: baseUsername,
      display_name: displayName,
      email,
      avatar_url: googleAvatar,
      banner_url: null,
      bio: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const existing = await this.getProfile(user.id);
      if (existing) return existing;

      let candidateUsername = baseUsername;
      let attempt = 0;
      const maxAttempts = 5;

      while (attempt < maxAttempts) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', candidateUsername)
          .maybeSingle();

        if (!data) {
          break; // Unique username found
        }

        attempt++;
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        candidateUsername = `${baseUsername}${randomSuffix}`;
      }

      const newProfile: UserProfile = {
        ...fallbackProfile,
        username: candidateUsername,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.warn('[ProfileService] ensureProfile insert warning:', insertError.message);
        return newProfile;
      }

      return inserted as UserProfile;
    } catch (err) {
      console.warn('[ProfileService] ensureProfile exception:', err);
      return fallbackProfile;
    }
  }

  /**
   * Updates fields on user profile with upsert to prevent missing row errors
   */
  public static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const cleanUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.username !== undefined) cleanUpdates.username = updates.username.trim().toLowerCase();
      if (updates.display_name !== undefined) cleanUpdates.display_name = updates.display_name.trim();
      if (updates.bio !== undefined) cleanUpdates.bio = updates.bio;
      if (updates.avatar_url !== undefined) cleanUpdates.avatar_url = updates.avatar_url;
      if (updates.banner_url !== undefined) cleanUpdates.banner_url = updates.banner_url;

      // 1. Try standard UPDATE first (avoids NOT NULL constraint check on omitted fields like email)
      const { data: updatedData, error: updateError } = await supabase
        .from('profiles')
        .update(cleanUpdates)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (!updateError && updatedData) {
        return updatedData as UserProfile;
      }

      // 2. If row does not exist yet, fallback to upsert with required email
      let email = updates.email;
      if (!email) {
        const { data: authData } = await supabase.auth.getUser();
        email = authData?.user?.email || `${cleanUpdates.username || 'user'}@localspo.app`;
      }

      const { data: upsertedData, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          ...cleanUpdates,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[ProfileService] updateProfile upsert error:', upsertError.message || upsertError);
        throw upsertError;
      }
      return upsertedData as UserProfile;
    } catch (err) {
      console.error('[ProfileService] updateProfile exception:', err);
      throw err;
    }
  }

  /**
   * Uploads avatar image to Supabase Storage 'avatars' bucket
   */
  public static async uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('[ProfileService] uploadAvatar storage error:', uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      await this.updateProfile(userId, { avatar_url: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error('[ProfileService] uploadAvatar exception:', err);
      return null;
    }
  }

  /**
   * Uploads banner image to Supabase Storage 'banners' bucket
   */
  public static async uploadBanner(userId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('[ProfileService] uploadBanner storage error:', uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      await this.updateProfile(userId, { banner_url: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error('[ProfileService] uploadBanner exception:', err);
      return null;
    }
  }
}
