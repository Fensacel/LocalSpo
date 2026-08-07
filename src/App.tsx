import { HashRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { SongsPage } from '@/pages/SongsPage';
import { AlbumsPage } from '@/pages/AlbumsPage';
import { ArtistsPage } from '@/pages/ArtistsPage';
import { AlbumDetailPage } from '@/pages/AlbumDetailPage';
import { ArtistDetailPage } from '@/pages/ArtistDetailPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { PlaylistDetailPage } from '@/pages/PlaylistDetailPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SearchPage } from '@/pages/SearchPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DocsPage } from '@/pages/DocsPage';
import { DownloadsPage } from '@/modules/downloader/pages/DownloadsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { UsersPage } from '@/pages/UsersPage';
import { StatsPage } from '@/pages/StatsPage';
import { LoginPage } from '@/pages/LoginPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { AuthProvider } from '@/providers/AuthProvider';
import { useSettingsStore, useFavoritesStore, useHistoryStore, usePlaylistStore } from '@/stores';
import { useProfileStore } from '@/stores/useProfileStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { useFollowedPlaylistStore } from '@/stores/useFollowedPlaylistStore';
import { useEffect } from 'react';
import { AudioEngine } from '@/features/player/AudioEngine';
import { useScanner } from '@/hooks/useScanner';
import { useWindowsTaskbar } from '@/hooks/useWindowsTaskbar';
import { useDynamicTheme } from '@/hooks/useDynamicTheme';
import { useDiscordRPC } from '@/hooks/useDiscordRPC';

export function App() {
  const isAuthCallbackPath = typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback');

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const loadStats = useStatsStore((s: any) => s.loadStats);
  const loadFollowedPlaylists = useFollowedPlaylistStore((s) => s.loadFollowedPlaylists);

  useEffect(() => {
    loadSettings();
    loadFavorites();
    loadHistory();
    loadPlaylists();
    loadProfile();
    loadStats();
    loadFollowedPlaylists();
  }, [loadSettings, loadFavorites, loadHistory, loadPlaylists, loadProfile, loadStats, loadFollowedPlaylists]);

  // Initialize scanner and load library
  useScanner();

  // Windows Taskbar Integration (title, thumbnail toolbar, media keys)
  useWindowsTaskbar();

  // Dynamic Theme: extract accent color from album art on each track change
  useDynamicTheme();

  // Discord Rich Presence: broadcast playback state to Discord
  useDiscordRPC();

  if (isAuthCallbackPath) {
    return <AuthCallbackPage />;
  }

  return (
    <AuthProvider>
      <HashRouter>
        <AudioEngine />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/albums/:id" element={<AlbumDetailPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artists/:id" element={<ArtistDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
