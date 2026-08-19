import { usePlaylistStore, useLibraryStore } from '@/stores';
import { useFollowedPlaylistStore } from '@/stores/useFollowedPlaylistStore';
import { ListMusic, Plus, Radio, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImportPlaylistModal } from '@/components/ImportPlaylistModal';
import { platformService } from '@/platform';
import { SafeImage } from '@/components/SafeImage';

export function PlaylistsPage() {
  const { playlists, createPlaylist, deletePlaylist } = usePlaylistStore();
  const { getSongById } = useLibraryStore();
  const { followedPlaylists, syncAll, unfollowPlaylist } = useFollowedPlaylistStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistCover, setNewPlaylistCover] = useState<string | null>(null);
  const navigate = useNavigate();

  const confirmDelete = async () => {
    if (!playlistToDelete) return;
    const { id, name } = playlistToDelete;
    await deletePlaylist(id);
    if (name) await deletePlaylist(name);
    await unfollowPlaylist(id);
    if (name) await unfollowPlaylist(name);
    setPlaylistToDelete(null);
  };

  const handlePickCover = async () => {
    const file = await platformService.dialog.openImage();
    if (file) {
      setNewPlaylistCover(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    try {
      const newPlaylist = await createPlaylist(name, newPlaylistDesc, newPlaylistCover);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setNewPlaylistCover(null);
      setShowCreateModal(false);
      if (newPlaylist?.id) {
        navigate(`/playlists/${newPlaylist.id}`);
      }
    } catch (err) {
      console.error('Failed to create playlist:', err);
      setShowCreateModal(false);
    }
  };

  // Combine & deduplicate local and streaming playlists seamlessly into one list
  const displayItems = useMemo(() => {
    const map = new Map<string, { id: string; name: string; description?: string; coverPath?: string | null; trackCount: number }>();

    for (const p of playlists) {
      const count = p.songIds.filter((sid) => !!getSongById(sid)).length;
      map.set(p.id, {
        id: p.id,
        name: p.name,
        description: p.description,
        coverPath: p.coverPath,
        trackCount: count,
      });
    }

    for (const f of followedPlaylists) {
      const existing = map.get(f.id) || Array.from(map.values()).find((item) => item.name === f.name);
      if (existing) {
        existing.coverPath = existing.coverPath || f.coverPath;
        existing.trackCount = Math.max(existing.trackCount, f.trackCount);
        map.set(existing.id, existing);
      } else {
        map.set(f.id, {
          id: f.id,
          name: f.name,
          description: f.description,
          coverPath: f.coverPath,
          trackCount: f.trackCount,
        });
      }
    }

    return Array.from(map.values());
  }, [playlists, followedPlaylists, getSongById]);

  return (
    <div className="relative pb-16 select-none">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Playlists</h1>
          <p className="text-xs text-text/40 mt-0.5">
            {displayItems.length} playlist{displayItems.length !== 1 ? 's' : ''} in library
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {followedPlaylists.length > 0 && (
            <button
              onClick={() => syncAll()}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className="text-[#0070F3]" />
              Sync All
            </button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-xl text-xs font-bold text-sky-400 transition-all cursor-pointer"
          >
            <Radio size={14} />
            Import / Follow
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary rounded-xl text-xs font-bold text-zinc-950 shadow-glow hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus size={14} />
            New Playlist
          </motion.button>
        </div>
      </div>

      {/* Playlists Grid */}
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayItems.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/playlists/${item.id}`)}
              className="group relative bg-[#141416] p-3.5 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-white/5 relative border border-white/5">
                <SafeImage src={item.coverPath} alt={item.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlaylistToDelete(item);
                  }}
                  title="Delete playlist"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-500 text-white/80 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer shadow-lg"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <h3 className="text-xs font-bold text-white truncate group-hover:text-[#0070F3] transition-colors">
                {item.name}
              </h3>
              <p className="text-[11px] text-text/40 truncate mt-0.5">
                {item.trackCount} tracks
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text/30 gap-2 bg-[#141416] border border-white/5 rounded-2xl">
          <ListMusic size={40} className="opacity-20 text-[#0070F3]" />
          <p className="text-xs font-semibold text-white">No playlists found</p>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {playlistToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#141416] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4"
            >
              <h3 className="text-sm font-bold text-white">Delete Playlist?</h3>
              <p className="text-xs text-text/50">
                Are you sure you want to delete <strong>"{playlistToDelete.name}"</strong>? This will remove it completely from your library and account.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setPlaylistToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-text/60 hover:text-text hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ImportPlaylistModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-[#141416] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-white">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[11px] text-text/40 block mb-1 font-semibold">Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My Playlist"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-text/30 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-text/40 block mb-1 font-semibold">Description (optional)</label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Playlist description..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-text/30 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handlePickCover}
                  className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs text-text/60 hover:text-white transition-colors"
                >
                  {newPlaylistCover ? 'Cover Selected ✓' : 'Choose Cover Image'}
                </button>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-text/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-4 py-2 text-xs font-bold bg-primary text-zinc-950 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
