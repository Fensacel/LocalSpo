import { supabase } from '@/lib/supabase';
import { platformService } from '@/platform';

export type UserDataType = 'playlists' | 'history' | 'favorites' | 'stats' | 'profile';

export class UserSyncService {
  /**
   * Reads data for a specific user ID and data type.
   * - If userId is null (Guest mode), returns fallback default (null/[]).
   * - Tries Supabase table `user_user_data` if available.
   * - Falls back to isolated local file `user_data_${userId}_${dataType}.json`.
   */
  public static async readData<T = any>(
    userId: string | null,
    dataType: UserDataType
  ): Promise<T | null> {
    if (!userId) {
      // Guest Mode: no cloud / account persistence
      return null;
    }

    const localKey = `user_data_${userId}_${dataType}.json`;

    // 1. Try Supabase user_data table first if user is authenticated
    try {
      const { data, error } = await supabase
        .from('user_user_data')
        .select('content')
        .eq('user_id', userId)
        .eq('data_type', dataType)
        .maybeSingle();

      if (!error && data?.content) {
        console.log(`[UserSyncService] Loaded ${dataType} from Supabase DB for user:`, userId);
        // Also cache locally for offline access
        await platformService.data.write(localKey, data.content).catch(() => {});
        return data.content as T;
      }
    } catch (err) {
      console.warn(`[UserSyncService] Supabase DB read for ${dataType} failed, falling back to local storage:`, err);
    }

    // 2. Fall back to per-account local file
    try {
      const localData = await platformService.data.read<T>(localKey);
      if (localData !== null) {
        console.log(`[UserSyncService] Loaded ${dataType} from local account storage for user:`, userId);
        return localData;
      }
    } catch (err) {
      console.warn(`[UserSyncService] Local read failed for ${localKey}:`, err);
    }

    return null;
  }

  /**
   * Writes data for a specific user ID and data type.
   * - If userId is null (Guest mode), skips cloud/persistent saving.
   * - Saves to isolated local file `user_data_${userId}_${dataType}.json`.
   * - Syncs to Supabase table `user_user_data` asynchronously.
   */
  public static async writeData<T = any>(
    userId: string | null,
    dataType: UserDataType,
    content: T
  ): Promise<boolean> {
    if (!userId) {
      // Guest mode: do not persist data to cloud or file
      return false;
    }

    const localKey = `user_data_${userId}_${dataType}.json`;

    // 1. Write to per-account local file immediately
    try {
      await platformService.data.write(localKey, content);
    } catch (err) {
      console.error(`[UserSyncService] Failed to write local ${localKey}:`, err);
    }

    // 2. Sync to Supabase user_user_data table in background
    try {
      const { error } = await supabase
        .from('user_user_data')
        .upsert(
          {
            user_id: userId,
            data_type: dataType,
            content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, data_type' }
        );

      if (!error) {
        console.log(`[UserSyncService] Synced ${dataType} to Supabase DB for user:`, userId);
      } else {
        console.warn(`[UserSyncService] Supabase cloud sync skipped for ${dataType}: ${error.message}`);
      }
    } catch (err) {
      // Non-blocking background sync warning
      console.warn(`[UserSyncService] Supabase DB write failed for ${dataType}:`, err);
    }

    return true;
  }
}
