import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListMusic, RefreshCw, Loader } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { importSpotifyPlaylistByUrl, importToPlaylist } from '../services/spotifyService';

export function PlaylistsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playlists, createPlaylist, importSpotifyPlaylist, syncFollowedPlaylist, loading } = usePlaylistStore();
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user) return;
    const pl = await createPlaylist(user.id, 'New Playlist');
    navigate(`/playlists/${pl.id}`);
  };

  const handleImport = async () => {
    if (!user || !importUrl.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const imported = await importSpotifyPlaylistByUrl(importUrl.trim());
      if (!imported) {
        setImportError('Could not fetch playlist. Make sure Spotify is connected in Settings and the URL is valid.');
        setImporting(false);
        return;
      }
      const pl = importToPlaylist(imported, user.id);
      const created = await importSpotifyPlaylist(user.id, pl);
      setShowImport(false);
      setImportUrl('');
      navigate(`/playlists/${created.id}`);
    } catch (err) {
      setImportError(String(err));
    }
    setImporting(false);
  };

  const handleSync = async (playlistId: string) => {
    setSyncing(playlistId);
    await syncFollowedPlaylist(playlistId);
    setSyncing(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Playlists</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl text-sm text-white/70 hover:text-white transition-colors"
          >
            <ListMusic size={16} />
            Import Spotify
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-xl text-sm text-white font-medium transition-colors"
          >
            <Plus size={16} />
            New Playlist
          </button>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-4">Import Spotify Playlist</h2>
            <p className="text-white/50 text-sm mb-4">
              Paste a Spotify playlist URL. This imports metadata only — not audio downloads.
            </p>
            <input
              type="text"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="w-full bg-surface-200 border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary-500 mb-3"
            />
            {importError && <p className="text-red-400 text-sm mb-3">{importError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImport(false); setImportUrl(''); setImportError(''); }}
                className="flex-1 py-2.5 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl text-sm text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importUrl.trim()}
                className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-xl text-sm text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {importing ? <><Loader size={14} className="animate-spin" /> Importing...</> : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlists grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={24} className="text-primary-400 animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <ListMusic size={48} className="text-white/10" />
          <p className="text-white/30">No playlists yet</p>
          <button
            onClick={handleCreate}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full text-sm font-medium transition-colors"
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {playlists.map((pl) => (
            <div key={pl.id} className="group flex flex-col gap-2">
              <button
                onClick={() => navigate(`/playlists/${pl.id}`)}
                className="aspect-square rounded-xl overflow-hidden bg-surface-200 border border-border block w-full"
              >
                <img
                  src={pl.coverUrl || '/default-cover.png'}
                  alt={pl.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                />
              </button>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => navigate(`/playlists/${pl.id}`)} className="text-left min-w-0">
                  <p className="text-white text-sm font-medium line-clamp-1">{pl.title}</p>
                  <p className="text-white/40 text-xs">{pl.tracks.length} tracks</p>
                  {pl.source === 'spotify' && (
                    <p className="text-white/25 text-xs">Spotify import</p>
                  )}
                </button>
                {pl.sourcePlaylistId && (
                  <button
                    onClick={() => handleSync(pl.id)}
                    disabled={syncing === pl.id}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                    title="Sync playlist"
                  >
                    <RefreshCw size={14} className={syncing === pl.id ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
