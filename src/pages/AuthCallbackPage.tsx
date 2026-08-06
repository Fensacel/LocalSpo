import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function processCallback() {
      try {
        // 1. Check if session is already active
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          if (isMounted) setStatus('success');
          return;
        }

        // 2. Parse hash or search parameters
        const hash = window.location.hash;
        const search = window.location.search;

        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
        const queryParams = new URLSearchParams(search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = hashParams.get('code') || queryParams.get('code');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('[AuthCallback] setSession error:', error);
            if (isMounted) {
              setStatus('error');
              setErrorMsg(error.message);
            }
            return;
          }

          // Try launching Electron desktop app via deep link
          try {
            const deepLinkUrl = `localspo://auth/callback#${hash.substring(1) || search.substring(1)}`;
            window.location.href = deepLinkUrl;
          } catch {}

          if (isMounted) setStatus('success');
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[AuthCallback] exchangeCode error:', error);
            if (isMounted) {
              setStatus('error');
              setErrorMsg(error.message);
            }
            return;
          }
          if (isMounted) setStatus('success');
          return;
        }

        if (isMounted) {
          setStatus('error');
          setErrorMsg('No access token or authorization code found in callback URL.');
        }
      } catch (err: any) {
        console.error('[AuthCallback] processCallback exception:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMsg(err?.message || 'Authentication callback failed.');
        }
      }
    }

    // Listen for auth state changes as fallback
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isMounted) {
        setStatus('success');
      }
    });

    processCallback();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-[#070709] text-white flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-md p-8 glass rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex justify-center">
          <img src={logoImg} alt="LocalSpo" className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(0,112,243,0.4)]" />
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            <Loader2 size={36} className="animate-spin text-[#0070F3] mx-auto" />
            <h2 className="text-lg font-bold">Completing Sign In...</h2>
            <p className="text-xs text-white/50">Exchanging authorization tokens with LocalSpo</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <CheckCircle2 size={44} className="text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-300">Authentication Successful!</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              LocalSpo Desktop is opening. You can close this browser tab and return to your application.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle size={44} className="text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-red-400">Authentication Link Expired</h2>
            <p className="text-xs text-red-300/80 leading-relaxed">
              {errorMsg || 'This login token has expired or was already used. Please open your LocalSpo Desktop app and click Continue with Google to initiate a new login.'}
            </p>
            <button
              onClick={() => { window.location.href = window.location.origin + '/#/login'; }}
              className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
            >
              Return to Login Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
