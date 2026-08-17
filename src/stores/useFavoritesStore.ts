import { create } from 'zustand';
import type { FavoritesData } from '@/types';
import { UserSyncService } from '@/services/userSyncService';
import { useToastStore } from './useToastStore';

interface FavoritesState extends FavoritesData {
  isLoaded: boolean;
  activeUserId: string | null;
  loadFavorites: (userId?: string | null) => Promise<void>;
  toggleFavoriteSong: (songId: string) => Promise<void>;
  toggleFavoriteAlbum: (albumId: string) => Promise<void>;
  toggleFavoriteArtist: (artistId: string) => Promise<void>;
  isFavoriteSong: (songId: string) => boolean;
  isFavoriteAlbum: (albumId: string) => boolean;
  isFavoriteArtist: (artistId: string) => boolean;
}

const defaultFavorites: FavoritesData = {
  songIds: [],
  albumIds: [],
  artistIds: [],
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ...defaultFavorites,
  isLoaded: false,
  activeUserId: null,

  loadFavorites: async (userId?: string | null) => {
    const targetUserId = userId !== undefined ? userId : get().activeUserId;
    set({ activeUserId: targetUserId });

    try {
      const data = await UserSyncService.readData<FavoritesData>(
        targetUserId,
        'favorites'
      );

      if (data) {
        set({
          songIds: data.songIds || [],
          albumIds: data.albumIds || [],
          artistIds: data.artistIds || [],
          isLoaded: true,
        });
      } else {
        set({ ...defaultFavorites, isLoaded: true });
      }
    } catch {
      set({ ...defaultFavorites, isLoaded: true });
    }
  },

  toggleFavoriteSong: async (songId) => {
    const { songIds, albumIds, artistIds, activeUserId } = get();
    const isFav = songIds.includes(songId);
    const newSongIds = isFav ? songIds.filter((id) => id !== songId) : [...songIds, songId];

    set({ songIds: newSongIds });
    await UserSyncService.writeData(activeUserId, 'favorites', {
      songIds: newSongIds,
      albumIds,
      artistIds,
    });

    useToastStore.getState().showToast(
      isFav ? 'Removed from Liked Songs' : 'Added to Liked Songs',
      isFav ? 'info' : 'success'
    );
  },

  toggleFavoriteAlbum: async (albumId) => {
    const { songIds, albumIds, artistIds, activeUserId } = get();
    const isFav = albumIds.includes(albumId);
    const newAlbumIds = isFav ? albumIds.filter((id) => id !== albumId) : [...albumIds, albumId];

    set({ albumIds: newAlbumIds });
    await UserSyncService.writeData(activeUserId, 'favorites', {
      songIds,
      albumIds: newAlbumIds,
      artistIds,
    });

    useToastStore.getState().showToast(
      isFav ? 'Removed from Library' : 'Saved to Library',
      isFav ? 'info' : 'success'
    );
  },

  toggleFavoriteArtist: async (artistId) => {
    const { songIds, albumIds, artistIds, activeUserId } = get();
    const isFav = artistIds.includes(artistId);
    const newArtistIds = isFav
      ? artistIds.filter((id) => id !== artistId)
      : [...artistIds, artistId];

    set({ artistIds: newArtistIds });
    await UserSyncService.writeData(activeUserId, 'favorites', {
      songIds,
      albumIds,
      artistIds: newArtistIds,
    });

    useToastStore.getState().showToast(
      isFav ? 'Removed from Library' : 'Saved to Library',
      isFav ? 'info' : 'success'
    );
  },

  isFavoriteSong: (songId) => get().songIds.includes(songId),
  isFavoriteAlbum: (albumId) => get().albumIds.includes(albumId),
  isFavoriteArtist: (artistId) => get().artistIds.includes(artistId),
}));
