/**
 * UsersPage – /users
 * Social user search. Live search by username or display name.
 * Architecture ready for: activity feed, comments, messaging, friend requests.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Users, CheckCircle, UserPlus, UserCheck } from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import type { SocialUser } from '@/stores/useProfileStore';

export function UsersPage() {
  const navigate = useNavigate();
  const { knownUsers, profile, followUser, unfollowUser, isFollowing } = useProfileStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return knownUsers;
    return knownUsers.filter(
      (u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q),
    );
  }, [query, knownUsers]);

  // Suggestions (first 5 while typing)
  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    return results.slice(0, 5);
  }, [query, results]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Discover Users</h1>
        <p className="text-[#8B90A0] text-sm mt-1">Find and follow other LocalSpo listeners</p>
      </div>

      {/* Search box */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B90A0]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or display name..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-[#8B90A0] focus:outline-none focus:border-[#0070F3] transition-colors"
        />

        {/* Live suggestions dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/profile/${u.username}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0070F3] to-purple-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={14} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-white truncate">{u.displayName}</span>
                      {u.isVerified && <CheckCircle size={12} className="text-[#0070F3] shrink-0" />}
                    </div>
                    <span className="text-xs text-[#8B90A0]">@{u.username}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Own profile card */}
      {profile && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase mb-3">Your Profile</h2>
          <UserCard
            user={{
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
              bio: profile.bio,
              isVerified: profile.isVerified,
              followersCount: profile.followersCount,
              publicPlaylistIds: profile.publicPlaylistIds,
            }}
            isOwnProfile
            isFollowing={false}
            onFollow={() => {}}
            onUnfollow={() => {}}
            onClick={() => navigate('/profile/me')}
          />
        </section>
      )}

      {/* Results */}
      <section>
        <h2 className="text-xs font-bold tracking-widest text-[#8B90A0] uppercase mb-3">
          {query.trim() ? `Results for "${query}"` : 'All Users'}
        </h2>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8B90A0] gap-3">
            <Users size={40} className="opacity-30" />
            <p className="text-sm">
              {query.trim() ? 'No users found.' : 'No other users discovered yet.'}
            </p>
            <p className="text-xs text-center max-w-xs opacity-70">
              Social features are ready for multi-device sync. Connect with other LocalSpo users when the cloud sync feature launches.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                isOwnProfile={u.id === profile?.id}
                isFollowing={isFollowing(u.id)}
                onFollow={() => followUser(u.id)}
                onUnfollow={() => unfollowUser(u.id)}
                onClick={() => navigate(`/profile/${u.username}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Future features notice */}
      <div className="rounded-xl border border-[#0070F3]/20 bg-[#0070F3]/5 p-4 text-xs text-[#8B90A0] space-y-1">
        <p className="text-[#0070F3] font-semibold text-sm">Coming Soon</p>
        <p>Activity Feed · Comments · Messaging · Friend Requests · Collaborative Playlists</p>
      </div>
    </motion.div>
  );
}

// ── UserCard sub-component ─────────────────────────────────────────────────

interface UserCardProps {
  user: SocialUser;
  isOwnProfile: boolean;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onClick: () => void;
}

function UserCard({ user, isOwnProfile, isFollowing, onFollow, onUnfollow, onClick }: UserCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0070F3] to-purple-700 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white/10">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `file://${user.avatarUrl}`}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={20} className="text-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white text-sm truncate">{user.displayName}</span>
          {user.isVerified && <CheckCircle size={13} className="text-[#0070F3] shrink-0" />}
        </div>
        <p className="text-xs text-[#8B90A0]">@{user.username}</p>
        {user.bio && <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{user.bio}</p>}
        <p className="text-[10px] text-[#8B90A0] mt-0.5">{user.followersCount} followers · {user.publicPlaylistIds.length} playlists</p>
      </div>

      {/* Follow button */}
      {!isOwnProfile && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            isFollowing ? onUnfollow() : onFollow();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            isFollowing
              ? 'bg-white/10 text-[#9CA3AF] hover:bg-red-500/20 hover:text-red-400'
              : 'bg-[#0070F3] text-white hover:bg-[#0070F3]/80'
          }`}
        >
          {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
        </button>
      )}
      {isOwnProfile && (
        <span className="text-xs text-[#8B90A0] px-2">You</span>
      )}
    </motion.div>
  );
}
