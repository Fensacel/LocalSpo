/**
 * LocalSpo Web — App Entry
 * Uses ONLY web/src/ components. No @/ (Desktop) imports here.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

import { AuthProvider } from './providers/AuthProvider';
import { AppLayout } from './layouts/AppLayout';
import { AudioEngine } from './features/player/AudioEngine';

import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { NowPlayingPage } from './pages/NowPlayingPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

import { usePlayerStore } from './stores/usePlayerStore';

function AppContent() {
  const init = usePlayerStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <AudioEngine />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/now-playing" element={<NowPlayingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
