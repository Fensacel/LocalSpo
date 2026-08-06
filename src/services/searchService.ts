import { supabase } from '@/lib/supabase';
import type { UserProfile } from './profileService';

export class SearchService {
  /**
   * Search users in Supabase profiles by username or display_name
   */
  public static async searchUsers(query: string, limit = 20): Promise<UserProfile[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
        .limit(limit);

      if (error || !data) {
        console.warn('[SearchService] searchUsers warning:', error?.message);
        return [];
      }

      return data as UserProfile[];
    } catch (err) {
      console.error('[SearchService] searchUsers exception:', err);
      return [];
    }
  }
}
