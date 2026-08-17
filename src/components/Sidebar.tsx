import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  ListMusic,
  FolderOpen,
  Download,
  Plus,
  Library,
  Folder,
  Home,
} from 'lucide-react';
import { usePlaylistStore, useLibraryStore, useFavoritesStore, usePlayerStore } from '@/stores';
import { getImageUrl } from '@/utils';

import logoImg from '@/assets/logo.png';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { playlists, createPlaylist } = usePlaylistStore();
  const { songs } = useLibraryStore();
  const { songIds } = useFavoritesStore();

  const handleNav = (path: string) => {
    usePlayerStore.setState({ showLyrics: false, showNowPlaying: false });
    navigate(path);
  };

  const [activeFilter, setActiveFilter] = useState<'all' | 'playlists' | 'local'>('all');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newPl = await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    handleNav(`/playlists/${newPl.id}`);
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-[260px] h-full bg-[#0B0B0D] hidden md:flex flex-col shrink-0 z-40 select-none border-r border-white/5 pb-[110px]"
    >
      {/* Brand Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div
          onClick={() => handleNav('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <img
            src={logoImg}
            alt="LocalSpo"
            className="w-7 h-7 object-contain rounded-lg drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <span className="text-sm font-extrabold tracking-wide text-white group-hover:text-[#0070F3] transition-colors">
            LocalSpo
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="px-3 space-y-1 py-1">
        {[
          { path: '/', icon: <Home size={17} />, label: 'Home' },
          { path: '/songs', icon: <Library size={17} />, label: 'Library' },
          { path: '/downloads', icon: <Download size={17} />, label: 'Downloads' },
          { path: '/playlists', icon: <ListMusic size={17} />, label: 'Playlists' },
        ].map(({ path, icon, label }) => (
          <button
            key={path}
            type="button"
            onClick={() => handleNav(path)}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              location.pathname === path
                ? 'bg-[#0070F3] text-white shadow-glow'
                : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Library & Playlists Container ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 mx-2 mt-3 mb-2 bg-[#151518] rounded-xl border border-white/5 overflow-hidden">
        {/* Playlists Header */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
          <span className="font-mono text-[11px] font-bold tracking-wider text-[#8B90A0] uppercase">
            Playlists
          </span>

          <button
            onClick={() => setIsCreatingPlaylist(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all"
            title="Create Playlist"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-3 py-1 border-b border-white/5 pb-2">
          {(['all', 'playlists', 'local'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium transition-all capitalize ${
                activeFilter === f ? 'bg-white/15 text-white' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'playlists' ? 'Playlists' : 'Local'}
            </button>
          ))}
        </div>

        {/* Quick inline playlist creator */}
        {isCreatingPlaylist && (
          <form onSubmit={handleCreatePlaylist} className="p-2 border-b border-white/5 bg-white/5">
            <input
              type="text"
              autoFocus
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onBlur={() => !newPlaylistName && setIsCreatingPlaylist(false)}
              className="w-full bg-[#0B0B0D] border border-white/10 rounded-md px-2.5 py-1 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-[#0070F3]"
            />
          </form>
        )}

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
          {/* Liked Songs */}
          {(activeFilter === 'all' || activeFilter === 'playlists') && (
            <div
              onClick={() => handleNav('/favorites')}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer group ${
                location.pathname === '/favorites' ? 'bg-[#0070F3]/20 text-white border border-[#0070F3]/30' : 'hover:bg-white/5 text-[#9CA3AF]'
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shrink-0">
                <Heart size={14} className="text-white fill-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white group-hover:text-[#0070F3] transition-colors truncate">
                  Liked Songs
                </p>
                <p className="text-[10px] font-mono text-[#8B90A0] truncate">
                  {songIds.length} tracks
                </p>
              </div>
            </div>
          )}

          {/* Local Files item */}
          {(activeFilter === 'all' || activeFilter === 'local') && (
            <div
              onClick={() => handleNav('/songs')}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer group ${
                location.pathname === '/songs' ? 'bg-[#0070F3]/20 text-white border border-[#0070F3]/30' : 'hover:bg-white/5 text-[#9CA3AF]'
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Folder size={14} className="text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white group-hover:text-[#0070F3] transition-colors truncate">
                  Local Files
                </p>
                <p className="text-[10px] font-mono text-[#8B90A0] truncate">
                  {songs.length} files
                </p>
              </div>
            </div>
          )}

          {/* User Playlists */}
          {(activeFilter === 'all' || activeFilter === 'playlists') &&
            playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => handleNav(`/playlists/${pl.id}`)}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer group ${
                  location.pathname === `/playlists/${pl.id}` ? 'bg-[#0070F3]/20 text-white border border-[#0070F3]/30' : 'hover:bg-white/5 text-[#9CA3AF]'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-white/5 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                  {pl.coverPath ? (
                    <img src={getImageUrl(pl.coverPath) || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic size={14} className="text-[#8B90A0]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white group-hover:text-[#0070F3] transition-colors truncate">
                    {pl.name}
                  </p>
                  <p className="text-[10px] font-mono text-[#8B90A0] truncate">
                    {pl.songIds.length} tracks
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Add Folder button */}
        <div className="p-2 border-t border-white/5">
          <button
            onClick={async () => {
              const folder = await window.electronAPI.dialog.openFolder();
              if (folder) {
                window.dispatchEvent(new CustomEvent('scan-folder', { detail: folder }));
              }
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono text-[#8B90A0] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <FolderOpen size={14} />
            <span>Add Folder</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
