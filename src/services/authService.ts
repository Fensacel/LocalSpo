import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Initiates Google OAuth using the system default browser.
   * Electron MUST NOT use BrowserWindow for OAuth.
   */
  public static async signInWithGoogle(customRedirectUrl?: string): Promise<{ url?: string; error?: string }> {
    if (!isSupabaseConfigured) {
      return {
        error: 'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      };
    }

    try {
      const isElectron = Boolean(window.electronAPI?.auth);
      const defaultRedirect = isElectron
        ? 'localspo://auth/callback'
        : 'http://localhost:5173/auth/callback';

      const redirectTo = customRedirectUrl || defaultRedirect;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data?.url) {
        // Open system browser via Electron shell API
        if (window.electronAPI?.shell?.openExternal) {
          await window.electronAPI.shell.openExternal(data.url);
        } else {
          window.open(data.url, '_blank');
        }
        return { url: data.url };
      }

      return { error: 'Failed to obtain OAuth authorization URL' };
    } catch (err: any) {
      console.error('[AuthService] Google Sign-In error:', err);
      return { error: err?.message || 'An unexpected error occurred during Google Sign-In' };
    }
  }

  /**
   * Handles deep link callback from scheme localspo:// or http://localhost:...
   */
  public static async handleDeepLink(deepLinkUrl: string): Promise<{ session: Session | null; error?: string }> {
    try {
      console.log('[AuthService] Processing callback link:', deepLinkUrl);

      let urlObj: URL;
      if (deepLinkUrl.startsWith('localspo://')) {
        urlObj = new URL(deepLinkUrl.replace('localspo://', 'https://dummy.localspo/'));
      } else {
        urlObj = new URL(deepLinkUrl);
      }

      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const queryParams = new URLSearchParams(urlObj.search);

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const code = hashParams.get('code') || queryParams.get('code');

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) return { session: null, error: error.message };
        return { session: data.session };
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return { session: null, error: error.message };
        return { session: data.session };
      }

      return { session: null, error: 'No valid authentication tokens or code in deep link callback' };
    } catch (err: any) {
      console.error('[AuthService] Deep link parsing error:', err);
      return { session: null, error: err?.message || 'Failed to parse authentication callback' };
    }
  }

  /** Sign out from Supabase */
  public static async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to sign out' };
    }
  }

  /** Get current active session */
  public static async getSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  /** Get current user */
  public static async getUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }
}
