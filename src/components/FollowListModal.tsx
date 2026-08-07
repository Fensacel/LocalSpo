import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Loader2, UserCheck, UserPlus, CheckCircle } from 'lucide-react';
import { FriendService } from '@/services/friendService';
import { ProfileService, type UserProfile } from '@/services/profileService';
import { SafeAvatar } from '@/components/SafeImage';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/stores/useChatStore';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  targetUserId: string;
}

export function FollowListModal({ isOpen, onClose, type, targetUserId }: FollowListModalProps) {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const { isFollowing, isMutualFriend, toggleFollow } = useChatStore();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && targetUserId) {
      setIsLoading(true);
      const load = async () => {
        try {
          let ids: string[] = [];
          if (type === 'followers') {
            ids = await FriendService.getFollowerIds(targetUserId);
          } else {
            ids = await FriendService.getFollowingIds(targetUserId);
          }

          if (ids.length > 0) {
            const profiles = await ProfileService.getProfilesByIds(ids);
            setUsersList(profiles);
          } else {
            setUsersList([]);
          }
        } catch (err) {
          console.error('[FollowListModal] load error:', err);
          setUsersList([]);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }
  }, [isOpen, type, targetUserId]);

  if (!isOpen) return null;

  const currentUserId = user?.id || authProfile?.id;

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-[#141419] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#0070F3]" />
              <h2 className="text-base font-bold text-white capitalize">
                {type} ({usersList.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* List Content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-[#8B90A0]">
                <Loader2 size={24} className="animate-spin text-[#0070F3]" />
              </div>
            ) : usersList.length > 0 ? (
              usersList.map((u) => {
                const isMe = currentUserId === u.id;
                const following = isFollowing(u.id);
                const mutual = isMutualFriend(u.id);

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors border border-white/5"
                  >
                    <div
                      onClick={() => handleUserClick(u.username)}
                      className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    >
                      <SafeAvatar src={u.avatar_url} alt="" sizeClassName="w-10 h-10 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-[#0070F3] transition-colors flex items-center gap-1 truncate">
                          {u.display_name}
                          {u.isVerified && <CheckCircle size={12} className="text-[#0070F3] fill-[#0070F3]" />}
                        </div>
                        <div className="text-[11px] text-[#8B90A0] truncate">@{u.username}</div>
                      </div>
                    </div>

                    {!isMe && currentUserId && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await toggleFollow(currentUserId, u.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ml-2 ${
                          mutual
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400'
                            : following
                            ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-[#0070F3] text-white hover:bg-[#005bb5] shadow-md'
                        }`}
                      >
                        {mutual ? (
                          <>
                            <UserCheck size={13} /> Friends 👥
                          </>
                        ) : following ? (
                          <>
                            <UserCheck size={13} /> Following ✓
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} /> Follow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-[#8B90A0] space-y-2">
                <Users size={32} className="mx-auto text-white/20" />
                <p className="text-xs">No {type} found.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
