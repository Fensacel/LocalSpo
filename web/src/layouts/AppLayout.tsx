import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useProfileStore } from '../stores/useProfileStore';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { useFavoritesStore } from '../stores/useFavoritesStore';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { BottomPlayer } from '../components/BottomPlayer';

export function AppLayout() {
  const { user } = useAuth();
  const { fetchProfile, ensureProfile } = useProfileStore();
  const { fetchPlaylists } = usePlaylistStore();
  const { fetchLikedSongs } = useFavoritesStore();

  useEffect(() => {
    if (!user) return;
    const email = user.email || '';
    const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    ensureProfile(user.id, email, name, avatar).then(() => {
      fetchProfile(user.id);
    });
    fetchPlaylists(user.id);
    fetchLikedSongs(user.id);
  }, [user, ensureProfile, fetchProfile, fetchPlaylists, fetchLikedSongs]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        <BottomPlayer />
      </div>
    </div>
  );
}
