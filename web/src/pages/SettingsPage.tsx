import { useState } from 'react';
import { Info, Key, Music } from 'lucide-react';
import { setSpotifyToken } from '../services/spotifyService';

export function SettingsPage() {
  const [spotifyClientId, setSpotifyClientId] = useState(localStorage.getItem('lsp_spotify_client_id') || '');
  const [spotifyToken, setToken] = useState(localStorage.getItem('lsp_spotify_token') || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('lsp_spotify_client_id', spotifyClientId);
    localStorage.setItem('lsp_spotify_token', spotifyToken);
    if (spotifyToken) {
      // Assume 1h expiry for manually pasted tokens
      setSpotifyToken(spotifyToken, 3600);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Spotify */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Music size={20} className="text-green-400" />
          <h2 className="text-white font-semibold">Spotify Integration</h2>
        </div>
        <p className="text-white/50 text-sm">
          To search songs and import playlists, you need a Spotify access token.
          Get one from the <a href="https://developer.spotify.com/console/" target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300 underline">Spotify Developer Console</a>.
        </p>

        <div>
          <label className="text-white/50 text-sm mb-2 block">Spotify Access Token</label>
          <input
            type="password"
            value={spotifyToken}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Spotify Bearer token..."
            className="w-full bg-surface-200 border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <Info size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300/70 text-xs">
            This token is stored locally in your browser and is never sent to our servers.
            Tokens expire after 1 hour. For automatic token refresh, configure the stream backend.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </section>

      {/* Stream backend */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Key size={20} className="text-blue-400" />
          <h2 className="text-white font-semibold">Stream Backend</h2>
        </div>
        <p className="text-white/50 text-sm">
          Audio streaming requires a backend resolver. See{' '}
          <code className="bg-surface-200 px-1.5 py-0.5 rounded text-primary-400 text-xs">docs/WEB_STREAMING.md</code>{' '}
          for setup instructions.
        </p>
        <div className="bg-surface-200 border border-border rounded-xl px-4 py-3">
          <p className="text-white/30 text-xs font-mono">
            VITE_STREAM_API_URL={localStorage.getItem('lsp_stream_api') || '(not configured)'}
          </p>
        </div>
        <p className="text-white/30 text-xs">
          Set <code className="bg-surface-200 px-1 py-0.5 rounded">VITE_STREAM_API_URL</code> in your{' '}
          <code className="bg-surface-200 px-1 py-0.5 rounded">web/.env</code> file.
        </p>
      </section>
    </div>
  );
}
