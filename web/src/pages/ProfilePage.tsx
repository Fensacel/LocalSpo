import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Edit3, Check, X, MapPin, Calendar, Users } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useProfileStore } from '../stores/useProfileStore';
import { useStatsStore } from '../stores/useStatsStore';
import { supabase } from '../lib/supabase';
import { formatListeningTime } from '../lib/utils';
import type { Profile } from '../types';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { profile: myProfile, updateProfile, uploadAvatar, uploadBanner } = useProfileStore();
  const { stats, fetchStats } = useStatsStore();
  const navigate = useNavigate();

  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', username: '', bio: '', country: '' });
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = myProfile?.username === username;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isOwnProfile && myProfile) {
        setViewProfile(myProfile);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        if (data) {
          setViewProfile({
            id: data.id,
            username: data.username,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
            bannerUrl: data.banner_url,
            bio: data.bio,
            country: data.country,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      }
      setLoading(false);
    };
    load();
  }, [username, isOwnProfile, myProfile]);

  useEffect(() => {
    if (viewProfile) fetchStats(viewProfile.id);
  }, [viewProfile, fetchStats]);

  useEffect(() => {
    if (isOwnProfile && myProfile) setViewProfile(myProfile);
  }, [myProfile, isOwnProfile]);

  const startEdit = () => {
    if (!viewProfile) return;
    setEditForm({
      display_name: viewProfile.displayName,
      username: viewProfile.username,
      bio: viewProfile.bio || '',
      country: viewProfile.country || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!user || !viewProfile) return;
    setSaving(true);
    await updateProfile(user.id, {
      display_name: editForm.display_name,
      username: editForm.username,
      bio: editForm.bio,
      country: editForm.country,
    });
    setSaving(false);
    setEditing(false);
    if (editForm.username !== viewProfile.username) {
      navigate(`/profile/${editForm.username}`, { replace: true });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    await uploadAvatar(user.id, file);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    await uploadBanner(user.id, file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!viewProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white/40">User not found</p>
        <button onClick={() => navigate(-1)} className="text-primary-400 text-sm hover:text-primary-300">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-primary-900/50 to-surface-200 overflow-hidden flex-shrink-0">
        {viewProfile.bannerUrl && (
          <img
            src={viewProfile.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {isOwnProfile && (
          <>
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white/80 text-sm transition-colors"
            >
              <Camera size={14} />
              Change Banner
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </>
        )}
      </div>

      {/* Profile info */}
      <div className="px-6 pb-6">
        <div className="flex items-end justify-between -mt-12 mb-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={viewProfile.avatarUrl || '/default-cover.png'}
              alt={viewProfile.displayName}
              className="w-24 h-24 rounded-full border-4 border-surface object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
            />
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <Camera size={14} className="text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </>
            )}
          </div>

          {/* Actions */}
          {isOwnProfile && (
            <div className="flex items-center gap-2 mb-2">
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl text-sm text-white/70 transition-colors"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-xl text-sm text-white font-medium transition-colors"
                  >
                    <Check size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl text-sm text-white/70 hover:text-white transition-colors"
                >
                  <Edit3 size={14} />
                  Edit Profile
                </button>
              )}
            </div>
          )}
        </div>

        {/* Name/username */}
        {editing ? (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Display Name</label>
              <input
                value={editForm.display_name}
                onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                className="w-full max-w-sm bg-surface-200 border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Username</label>
              <input
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                className="w-full max-w-sm bg-surface-200 border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full max-w-sm bg-surface-200 border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Country</label>
              <input
                value={editForm.country}
                onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                className="w-full max-w-sm bg-surface-200 border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-white">{viewProfile.displayName}</h1>
            <p className="text-white/50 text-sm">@{viewProfile.username}</p>
            {viewProfile.bio && <p className="text-white/70 text-sm mt-2">{viewProfile.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-white/40 text-xs">
              {viewProfile.country && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {viewProfile.country}
                </span>
              )}
              {viewProfile.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Joined {new Date(viewProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.totalPlays}</p>
              <p className="text-white/40 text-xs mt-1">Total Plays</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{formatListeningTime(stats.totalDuration)}</p>
              <p className="text-white/40 text-xs mt-1">Listening Time</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.streak}</p>
              <p className="text-white/40 text-xs mt-1">Day Streak</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.topArtists.length}</p>
              <p className="text-white/40 text-xs mt-1">Artists</p>
            </div>
          </div>
        )}

        {/* Top songs */}
        {stats && stats.topSongs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Top Songs</h2>
            <div className="space-y-2">
              {stats.topSongs.slice(0, 5).map((item, i) => (
                <div key={item.track.id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
                  <span className="text-white/30 text-sm w-5 text-right">{i + 1}</span>
                  <img
                    src={item.track.coverUrl}
                    alt={item.track.title}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{item.track.title}</p>
                    <p className="text-white/40 text-xs">{item.track.artist}</p>
                  </div>
                  <p className="text-white/30 text-xs">{item.playCount} plays</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top artists */}
        {stats && stats.topArtists.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Top Artists</h2>
            <div className="flex flex-wrap gap-3">
              {stats.topArtists.slice(0, 8).map((a) => (
                <div key={a.artist} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Users size={14} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{a.artist}</p>
                    <p className="text-white/40 text-xs">{a.playCount} plays</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top albums */}
        {stats && stats.topAlbums.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Top Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.topAlbums.slice(0, 8).map((a) => (
                <div key={a.album} className="flex flex-col gap-2">
                  <div className="aspect-square rounded-xl overflow-hidden bg-surface-200 border border-border">
                    {a.coverUrl ? (
                      <img
                        src={a.coverUrl}
                        alt={a.album}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-4xl">♪</div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium line-clamp-1">{a.album}</p>
                    <p className="text-white/40 text-xs line-clamp-1">{a.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
