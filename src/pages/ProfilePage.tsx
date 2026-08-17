import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Edit3,
  CheckCircle,
  Users,
  Music,
  ListMusic,
  Clock,
  Globe,
  Calendar,
  Camera,
  Save,
  X,
  Disc3,
  Flame,
  Tag,
  MessageSquare,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { usePlaylistStore } from '@/stores';
import { useChatStore } from '@/stores/useChatStore';
import { FriendService } from '@/services/friendService';
import { SafeAvatar, SafeBanner, SafeImage } from '@/components/SafeImage';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService } from '@/services/profileService';
import { SocialChatDrawer } from '@/components/SocialChatDrawer';
import { FollowListModal } from '@/components/FollowListModal';

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#151518] rounded-xl p-4 flex flex-col gap-1 border border-white/5 shadow-md">
      <div className="text-[#8B90A0] text-xs flex items-center gap-1.5 font-mono">{icon}{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
    </div>
  );
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const { profile: localProfile, loadProfile, saveProfile } = useProfileStore();
  const stats = useStatsStore();
  const { playlists } = usePlaylistStore();
  const { isFollowing, isMutualFriend, toggleFollow, fetchFriends, followingIds, followerIds } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);

  const [realtimeFollowersCount, setRealtimeFollowersCount] = useState<number>(0);
  const [realtimeFollowingCount, setRealtimeFollowingCount] = useState<number>(0);

  useEffect(() => {
    const currentUserId = user?.id || authProfile?.id || localProfile?.id;
    if (currentUserId) {
      fetchFriends(currentUserId);
    }
  }, [user?.id, authProfile?.id, localProfile?.id, fetchFriends]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [fetchedTargetProfile, setFetchedTargetProfile] = useState<any | null>(null);

  const isOwnProfile = !username || username === authProfile?.username || username === localProfile?.username || username === 'me';

  useEffect(() => {
    if (!isOwnProfile && username) {
      const loadTarget = async () => {
        let p = await ProfileService.getProfileByUsername(username);
        if (!p && username.length > 20) {
          p = await ProfileService.getProfile(username);
        }
        if (p) {
          setFetchedTargetProfile({
            id: p.id,
            username: p.username,
            displayName: p.display_name,
            avatarUrl: p.avatar_url,
            bannerUrl: p.banner_url,
            bio: p.bio,
            country: '',
            favoriteGenres: [],
            favoriteArtists: [],
            favoriteAlbumIds: [],
            favoriteSongIds: [],
            joinDate: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
            isVerified: false,
            followersCount: 0,
            followingCount: 0,
            following: [],
            followers: [],
            publicPlaylistIds: [],
          });
        } else {
          setFetchedTargetProfile(null);
        }
      };
      loadTarget();
    }
  }, [username, isOwnProfile, authProfile?.username, localProfile?.username]);

  const defaultGuestProfile = {
    id: 'guest',
    username: 'guest',
    displayName: 'Guest',
    avatarUrl: null,
    bannerUrl: null,
    bio: 'LocalSpo Guest User',
    country: '',
    favoriteGenres: [],
    favoriteArtists: [],
    favoriteAlbumIds: [],
    favoriteSongIds: [],
    joinDate: Date.now(),
    isVerified: false,
    followersCount: 0,
    followingCount: 0,
    following: [],
    followers: [],
    publicPlaylistIds: [],
  };

  // Effective profile to display: own profile vs fetched target user profile
  const profile = isOwnProfile
    ? (!user
        ? defaultGuestProfile
        : authProfile ? {
            ...localProfile,
            id: authProfile.id,
            username: authProfile.username,
            displayName: authProfile.display_name,
            avatarUrl: avatarPreview || authProfile.avatar_url || localProfile?.avatarUrl || null,
            bannerUrl: bannerPreview || authProfile.banner_url || localProfile?.bannerUrl || null,
            bio: authProfile.bio || localProfile?.bio || '',
            country: localProfile?.country || '',
            favoriteGenres: localProfile?.favoriteGenres || [],
            favoriteArtists: localProfile?.favoriteArtists || [],
            favoriteAlbumIds: localProfile?.favoriteAlbumIds || [],
            favoriteSongIds: localProfile?.favoriteSongIds || [],
            joinDate: localProfile?.joinDate || Date.now(),
            isVerified: localProfile?.isVerified || false,
            followersCount: localProfile?.followersCount || 0,
            followingCount: localProfile?.followingCount || 0,
            following: localProfile?.following || [],
            followers: localProfile?.followers || [],
            publicPlaylistIds: localProfile?.publicPlaylistIds || [],
          } : localProfile)
    : fetchedTargetProfile;

  useEffect(() => {
    if (isOwnProfile) {
      setRealtimeFollowersCount(followerIds.length);
      setRealtimeFollowingCount(followingIds.length);
    } else if (profile?.id) {
      Promise.all([
        FriendService.getFollowerIds(profile.id),
        FriendService.getFollowingIds(profile.id),
      ]).then(([foll, fing]) => {
        setRealtimeFollowersCount(foll.length);
        setRealtimeFollowingCount(fing.length);
      });
    }
  }, [isOwnProfile, profile?.id, followerIds.length, followingIds.length]);

  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    country: '',
    favoriteGenres: [] as string[],
  });

  useEffect(() => {
    loadProfile();
    stats.loadStats();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        country: profile.country || '',
        favoriteGenres: profile.favoriteGenres || [],
      });
    }
  }, [profile?.displayName, profile?.username, profile?.bio]);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarPreview(dataUrl);
        setIsEditing(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setBannerPreview(dataUrl);
        setIsEditing(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAvatarClick = () => {
    if (!isOwnProfile || !user) return;
    avatarInputRef.current?.click();
  };

  const handleBannerClick = () => {
    if (!isOwnProfile || !user) return;
    bannerInputRef.current?.click();
  };

  const handleSave = async () => {
    const finalAvatar = avatarPreview !== null ? avatarPreview : (profile?.avatarUrl || null);
    const finalBanner = bannerPreview !== null ? bannerPreview : (profile?.bannerUrl || null);

    await saveProfile({
      ...editForm,
      avatarUrl: finalAvatar,
      bannerUrl: finalBanner,
    });

    if (user?.id) {
      await ProfileService.updateProfile(user.id, {
        display_name: editForm.displayName,
        username: editForm.username,
        bio: editForm.bio,
        avatar_url: finalAvatar,
        banner_url: finalBanner,
      });
      await refreshProfile();
    }

    setAvatarPreview(null);
    setBannerPreview(null);
    setIsEditing(false);
  };

  const topSongs = stats.getTopSongs(5);
  const topArtists = stats.getTopArtists(5);
  const topAlbums = stats.getTopAlbums(5);
  const recentlyPlayed = stats.getRecentlyPlayed(10);
  const publicPlaylists = playlists.filter((pl) =>
    profile?.publicPlaylistIds.includes(pl.id) || isOwnProfile,
  );

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8B90A0]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0070F3]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 select-none pb-12"
    >
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFileSelect} />

      {/* ── Banner ──────────────────────────────────────────────── */}
      <div
        className={`relative h-44 md:h-60 rounded-2xl overflow-hidden border border-white/5 ${isOwnProfile && user ? 'cursor-pointer group' : ''}`}
        onClick={handleBannerClick}
      >
        <SafeBanner src={bannerPreview || profile.bannerUrl}>
          {isOwnProfile && user && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
              <span className="text-white text-xs font-semibold ml-2">Ubah Banner</span>
            </div>
          )}
        </SafeBanner>
      </div>

      {/* ── Avatar + Name row ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-14 md:-mt-20 px-2 md:px-4">
        {/* Avatar */}
        <div
          className={`relative w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-[#0B0B0D] overflow-hidden bg-gradient-to-br from-[#0070F3] to-purple-700 shrink-0 ${isOwnProfile && user ? 'cursor-pointer group' : ''}`}
          onClick={handleAvatarClick}
        >
          <SafeAvatar src={avatarPreview || profile.avatarUrl} alt="Avatar" sizeClassName="w-full h-full" />
          {isOwnProfile && user && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={22} className="text-white" />
            </div>
          )}
        </div>

        {/* Name/username */}
        <div className="flex-1 pb-2">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xl font-bold w-full focus:outline-none focus:border-[#0070F3]"
                placeholder="Display Name"
              />
              <input
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value.replace(/\s/g, '') }))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[#8B90A0] text-sm w-full focus:outline-none focus:border-[#0070F3]"
                placeholder="@username"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
                {profile.isVerified && <CheckCircle size={20} className="text-[#0070F3] fill-[#0070F3]" />}
              </div>
              <p className="text-[#8B90A0] text-sm font-mono">@{profile.username}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#8B90A0] font-mono">
                <button
                  type="button"
                  onClick={() => setFollowModalType('followers')}
                  className="flex items-center gap-1 hover:text-[#0070F3] hover:underline transition-colors cursor-pointer"
                >
                  <Users size={12} />
                  <span>{realtimeFollowersCount} followers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowModalType('following')}
                  className="flex items-center gap-1 hover:text-[#0070F3] hover:underline transition-colors cursor-pointer"
                >
                  <Users size={12} />
                  <span>{realtimeFollowingCount} following</span>
                </button>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />Joined {new Date(profile.joinDate).toLocaleDateString()}
                </span>
                {profile.country && <span className="flex items-center gap-1"><Globe size={12} />{profile.country}</span>}
              </div>
            </>
          )}
        </div>

        {/* Edit / Save / Message / Follow actions */}
        <div className="flex items-center gap-2 pb-2">
          {!isEditing && !isOwnProfile && (
            <button
              onClick={() => setShowChatModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0070F3] text-white text-sm font-semibold hover:bg-[#0070F3]/80 transition-all cursor-pointer shadow-glow"
            >
              <MessageSquare size={14} /> Message
            </button>
          )}

          {!isEditing && !isOwnProfile && profile?.id && (
            <button
              type="button"
              onClick={async () => {
                if (user?.id && profile.id) {
                  await toggleFollow(user.id, profile.id);
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isMutualFriend(profile.id)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400'
                  : isFollowing(profile.id)
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400'
                  : 'bg-[#0070F3] text-white hover:bg-[#005bb5] shadow-glow'
              }`}
            >
              {isMutualFriend(profile.id) ? (
                <>
                  <UserCheck size={14} /> Friends 👥
                </>
              ) : isFollowing(profile.id) ? (
                <>
                  <UserCheck size={14} /> Following ✓
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Follow
                </>
              )}
            </button>
          )}

          {isOwnProfile && (
            <>
              {user ? (
                isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0070F3] text-white text-sm font-semibold hover:bg-[#0070F3]/80 transition-all cursor-pointer shadow-glow"
                    >
                      <Save size={14} /> Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-[#9CA3AF] text-sm hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>
                )
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:text-white text-sm font-semibold hover:bg-blue-600/30 transition-all cursor-pointer"
                >
                  Login dengan Google
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bio display */}
      {!isEditing && profile.bio && (
        <p className="text-[#9CA3AF] text-sm px-2 leading-relaxed">{profile.bio}</p>
      )}

      {/* ── Listening Stats ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1">Listening Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Today" value={stats.getTodayHours()} icon={<Clock size={12} />} />
          <StatCard label="This Week" value={stats.getWeekHours()} icon={<Clock size={12} />} />
          <StatCard label="This Month" value={stats.getMonthHours()} icon={<Clock size={12} />} />
          <StatCard label="Lifetime" value={stats.getLifetimeHours()} icon={<Clock size={12} />} />
          <StatCard label="Streak" value={`🔥 ${stats.getListeningStreak()} Days`} icon={<Flame size={12} className="text-amber-400" />} />
        </div>
      </section>


      {/* ── Top Songs (with artwork) ───────────────────────────────────────── */}
      {topSongs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1 flex items-center gap-2">
            <Music size={13} className="text-[#0070F3]" /> Top Songs
          </h2>
          <div className="space-y-1.5">
            {topSongs.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#151518] border border-white/5 hover:bg-[#1C1B1B] transition-all">
                <span className="text-[#8B90A0] text-xs w-4 text-right font-mono">{i + 1}</span>
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 shrink-0 overflow-hidden">
                  <SafeImage src={s.coverPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{s.title}</p>
                  <p className="text-[10px] font-mono text-[#8B90A0] truncate mt-0.5">{s.artist}</p>
                </div>
                <div className="text-xs text-white font-mono font-bold px-2">{s.count}×</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Top Artists & Top Albums Cards (with artwork) ────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {topArtists.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1 flex items-center gap-2">
              <Disc3 size={13} className="text-purple-400" /> Favorite Artists
            </h2>
            <div className="space-y-2">
              {topArtists.map((a: any) => (
                <div key={a.name} className="flex items-center gap-3 bg-[#151518] rounded-xl p-2.5 border border-white/5">
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <SafeAvatar src={a.coverPath} alt={a.name} sizeClassName="w-full h-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{a.name}</p>
                    <p className="text-[10px] font-mono text-[#8B90A0]">{a.count} plays</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {topAlbums.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1 flex items-center gap-2">
              <ListMusic size={13} className="text-emerald-400" /> Favorite Albums
            </h2>
            <div className="space-y-2">
              {topAlbums.map((a: any) => (
                <div key={a.name} className="flex items-center gap-3 bg-[#151518] rounded-xl p-2.5 border border-white/5">
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10">
                    <SafeImage src={a.coverPath} alt={a.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{a.name}</p>
                    <p className="text-[10px] font-mono text-[#8B90A0]">{a.count} plays</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Favorite Playlists (with artwork) ────────────────────────────── */}
      {publicPlaylists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1 flex items-center gap-2">
            <ListMusic size={13} className="text-[#0070F3]" /> Playlists
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {publicPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => navigate(`/playlists/${pl.id}`)}
                className="flex items-center gap-3 bg-[#151518] rounded-xl p-3 border border-white/5 cursor-pointer hover:bg-[#1C1B1B] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                  <SafeImage src={pl.coverPath} alt={pl.name} className="w-full h-full object-cover" fallback={<ListMusic size={18} className="text-[#8B90A0]" />} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                  <p className="text-[10px] font-mono text-[#8B90A0]">{pl.songIds.length} tracks</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recently Played (with cover artwork) ───────────────────────── */}
      {recentlyPlayed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1 flex items-center gap-2">
            <Clock size={13} className="text-[#0070F3]" /> Recently Played
          </h2>
          <div className="space-y-1.5">
            {recentlyPlayed.map((p: any, i: number) => (
              <div key={`${p.songId}-${i}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#151518] border border-white/5 hover:bg-[#1C1B1B] transition-all">
                <div className="w-9 h-9 rounded-lg bg-white/5 shrink-0 overflow-hidden border border-white/5">
                  <SafeImage src={p.coverPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{p.title}</p>
                  <p className="text-[10px] font-mono text-[#8B90A0] truncate mt-0.5">{p.artist}</p>
                </div>
                <span className="text-[10px] text-[#8B90A0] font-mono whitespace-nowrap">
                  {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Favorite Genres (with Genre Icon) ──────────────────────────────── */}
      {(profile.favoriteGenres.length > 0 || isEditing) && (
        <section className="space-y-3 pb-4">
          <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase font-mono px-1 flex items-center gap-2">
            <Tag size={13} className="text-[#0070F3]" /> Favorite Genres
          </h2>
          {isEditing ? (
            <input
              value={editForm.favoriteGenres.join(', ')}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  favoriteGenres: e.target.value.split(',').map((g) => g.trim()).filter(Boolean),
                }))
              }
              placeholder="Pop, Rock, Jazz, Classical..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white w-full focus:outline-none focus:border-[#0070F3]"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.favoriteGenres.map((g: string) => (
                <span key={g} className="px-3 py-1.5 rounded-full bg-[#0070F3]/15 border border-[#0070F3]/30 text-xs text-[#0070F3] font-semibold font-mono flex items-center gap-1.5">
                  <Tag size={11} /> {g}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Social Chat Drawer */}
      <SocialChatDrawer
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        initialUserId={isOwnProfile ? undefined : profile?.id}
      />

      {/* Followers / Following List Modal */}
      <FollowListModal
        isOpen={!!followModalType}
        onClose={() => setFollowModalType(null)}
        type={followModalType || 'followers'}
        targetUserId={profile?.id || ''}
      />
    </motion.div>
  );
}
