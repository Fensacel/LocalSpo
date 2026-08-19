import { supabase } from '@/lib/supabase';
import { platformService } from '@/platform';

export type UserDataType = 'playlists' | 'history' | 'favorites' | 'stats' | 'profile';

export class UserSyncService {
  /**
   * Resolves the active user ID from passed value or Supabase auth session.
   */
  private static async resolveUserId(userId?: string | null): Promise<string> {
    if (userId && userId !== 'guest') return userId;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) return data.user.id;
    } catch {}
    return 'guest';
  }

  /**
   * Reads data for a specific user ID and data type.
   * - If userId is 'guest', loads from guest local file.
   * - Tries Supabase table `user_user_data` if available for authenticated user.
   * - Falls back to isolated local file `user_data_${userId}_${dataType}.json`.
   */
  public static async readData<T = any>(
    userId: string | null | undefined,
    dataType: UserDataType
  ): Promise<T | null> {
    const targetUserId = await this.resolveUserId(userId);
    const localKey = `user_data_${targetUserId}_${dataType}.json`;

    // 1. Try Supabase user_user_data table first if user is authenticated (not guest)
    if (targetUserId !== 'guest') {
      try {
        const { data, error } = await supabase
          .from('user_user_data')
          .select('content')
          .eq('user_id', targetUserId)
          .eq('data_type', dataType)
          .maybeSingle();

        if (!error && data?.content) {
          console.log(`[UserSyncService] Loaded ${dataType} from Supabase DB for user:`, targetUserId);
          // Also cache locally for offline access
          await platformService.data.write(localKey, data.content).catch(() => {});
          return data.content as T;
        }
      } catch (err) {
        console.warn(`[UserSyncService] Supabase DB read for ${dataType} failed, falling back to local storage:`, err);
      }
    }

    // 2. Fall back to per-account local file
    try {
      const localData = await platformService.data.read<T>(localKey);
      if (localData !== null) {
        console.log(`[UserSyncService] Loaded ${dataType} from local account storage for user:`, targetUserId);
        return localData;
      }
    } catch (err) {
      console.warn(`[UserSyncService] Local read failed for ${localKey}:`, err);
    }

    return null;
  }

  /**
   * Writes data for a specific user ID and data type.
   * - Saves to isolated local file `user_data_${userId}_${dataType}.json`.
   * - Syncs to Supabase table `user_user_data` asynchronously.
   */
  public static async writeData<T = any>(
    userId: string | null | undefined,
    dataType: UserDataType,
    content: T
  ): Promise<boolean> {
    const targetUserId = await this.resolveUserId(userId);
    const localKey = `user_data_${targetUserId}_${dataType}.json`;

    // 1. Write to per-account local file immediately
    try {
      await platformService.data.write(localKey, content);
    } catch (err) {
      console.error(`[UserSyncService] Failed to write local ${localKey}:`, err);
    }

    // 2. Sync to Supabase user_user_data table in background if authenticated
    if (targetUserId !== 'guest') {
      try {
        const { error } = await supabase
          .from('user_user_data')
          .upsert(
            {
              user_id: targetUserId,
              data_type: dataType,
              content,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id, data_type' }
          );

        if (!error) {
          console.log(`[UserSyncService] Synced ${dataType} to Supabase DB for user:`, targetUserId);
          return true;
        } else {
          console.warn(`[UserSyncService] Supabase cloud sync skipped for ${dataType}: ${error.message}`);
          return false;
        }
      } catch (err) {
        console.warn(`[UserSyncService] Supabase DB write failed for ${dataType}:`, err);
        return false;
      }
    }

    return true;
  }
}
