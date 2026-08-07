import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Search,
  Loader2,
  Users,
  Sparkles,
  UserPlus,
  UserCheck,
  Music,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChatService, type ChatMessage, type UserConversationItem } from '@/services/chatService';
import { SearchService } from '@/services/searchService';
import type { UserProfile } from '@/services/profileService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useChatStore } from '@/stores/useChatStore';
import { SafeAvatar } from '@/components/SafeImage';

interface SocialChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string | null;
}

export function SocialChatDrawer({ isOpen, onClose, initialUserId }: SocialChatDrawerProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const currentSong = usePlayerStore((s) => s.currentSong);

  const handleViewProfile = (e: React.MouseEvent, username?: string | null, userId?: string) => {
    e.stopPropagation();
    const target = username || userId;
    if (target) {
      navigate(`/profile/${target}`);
      onClose();
    }
  };

  const { friends, fetchFriends, toggleFollow, isFollowing, isMutualFriend, clearUnread } = useChatStore();

  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'search'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTargetUser, setActiveTargetUser] = useState<{ id: string; name: string; avatar?: string | null } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<UserConversationItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);

  const fetchConversations = useCallback(async () => {
    const currentUserId = user?.id || (isValidUuid(profile?.id) ? profile?.id : null);
    if (!currentUserId) return;
    setIsLoadingConversations(true);
    const list = await ChatService.getUserConversations(currentUserId);
    setConversations(list);
    setIsLoadingConversations(false);
  }, [user?.id, profile?.id]);

  // Clear unread when drawer opens & fetch conversations
  useEffect(() => {
    if (isOpen) {
      clearUnread();
      const currentUserId = user?.id || (isValidUuid(profile?.id) ? profile?.id : null);
      if (currentUserId) {
        fetchFriends(currentUserId);
        fetchConversations();
      }
    }
  }, [isOpen, user?.id, profile?.id, clearUnread, fetchFriends, fetchConversations]);

  // Handle direct chat trigger
  useEffect(() => {
    if (initialUserId && user?.id && isOpen) {
      startChatWithUser(initialUserId);
    }
  }, [initialUserId, user?.id, isOpen]);

  // Live User Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await SearchService.searchUsers(searchQuery);
      setSearchResults(res.filter((u) => u.id !== user?.id));
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  // Load & Subscribe to Messages
  useEffect(() => {
    if (!activeConversationId) return;

    let unsubscribe: (() => void) | null = null;
    setIsLoadingMessages(true);

    async function initChat() {
      if (!activeConversationId) return;
      const msgs = await ChatService.getMessages(activeConversationId);
      setMessages(msgs);
      setIsLoadingMessages(false);

      unsubscribe = ChatService.subscribeToMessages(activeConversationId, (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      });
    }

    initChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isValidUuid = (id?: string | null) => Boolean(id && id.length === 36 && id.includes('-'));

  const startChatWithUser = async (targetUserId: string, targetName?: string, targetAvatar?: string | null) => {
    const currentUserId = user?.id || (isValidUuid(profile?.id) ? profile?.id : null);

    const targetInfo = {
      id: targetUserId,
      name: targetName || 'Friend',
      avatar: targetAvatar || null,
    };

    setActiveTargetUser(targetInfo);
    setActiveTab('chats');
    setIsLoadingMessages(true);

    if (!currentUserId || !isValidUuid(targetUserId)) {
      setIsLoadingMessages(false);
      return;
    }

    try {
      const convId = await ChatService.getOrCreateConversation(currentUserId, targetUserId);
      if (convId) {
        setActiveConversationId(convId);
      }
    } catch (err) {
      console.error('[SocialChatDrawer] startChatWithUser error:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const senderId = user?.id || (isValidUuid(profile?.id) ? profile?.id : null);
    if (!inputMessage.trim() || !activeConversationId || !senderId) return;

    const content = inputMessage.trim();
    setInputMessage('');

    const sent = await ChatService.sendMessage(activeConversationId, senderId, content);
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    }
  };

  const handleShareCurrentTrack = async () => {
    const senderId = user?.id || (isValidUuid(profile?.id) ? profile?.id : null);
    if (!currentSong || !activeConversationId || !senderId) return;
    const shareText = `🎵 Listening to: ${currentSong.title} - ${currentSong.artist}`;
    const sent = await ChatService.sendMessage(activeConversationId, senderId, shareText);
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    }
  };

  const handleToggleFollowClick = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    const currentUserId = user?.id || (isValidUuid(profile?.id) ? profile?.id : null);
    if (!currentUserId) return;
    await toggleFollow(currentUserId, targetId);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-[#101014] border-l border-white/10 flex flex-col shadow-2xl select-none"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#16161C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0070F3] to-purple-600 flex items-center justify-center text-white shadow-md">
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-none">Social Chat</h2>
                <p className="text-[11px] text-[#8B90A0] mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {profile ? `@${profile.username}` : 'LocalSpo Social Network'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-[#141419] p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-[#0070F3] text-white shadow-lg shadow-[#0070F3]/30'
                  : 'text-[#8B90A0] hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare size={14} />
              <span>Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'friends'
                  ? 'bg-[#0070F3] text-white shadow-lg shadow-[#0070F3]/30'
                  : 'text-[#8B90A0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={14} />
              <span>Friends ({friends.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-[#0070F3] text-white shadow-lg shadow-[#0070F3]/30'
                  : 'text-[#8B90A0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Search size={14} />
              <span>Find</span>
            </button>
          </div>

          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Your Friends</span>
                <span className="text-[11px] text-[#8B90A0]">{friends.length} Connected</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {friends.length > 0 ? (
                  friends.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors border border-white/5"
                    >
                      <div
                        onClick={(e) => handleViewProfile(e, f.username, f.id)}
                        className="flex items-center gap-3 cursor-pointer group/friend"
                        title="View profile"
                      >
                        <div className="relative">
                          <SafeAvatar src={f.avatar_url} alt="" sizeClassName="w-10 h-10" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#101014]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover/friend:text-[#0070F3] transition-colors flex items-center gap-1">
                            {f.display_name}
                            {f.isVerified && <CheckCircle size={12} className="text-[#0070F3] fill-[#0070F3]" />}
                          </div>
                          <div className="text-[11px] text-[#8B90A0]">@{f.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startChatWithUser(f.id, f.display_name, f.avatar_url)}
                          className="px-3 py-1.5 bg-[#0070F3] hover:bg-[#005bb5] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1"
                        >
                          <MessageSquare size={12} /> Chat
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFollowClick(e, f.id)}
                          title="Unfollow"
                          className="p-1.5 bg-white/5 hover:bg-red-500/20 text-[#8B90A0] hover:text-red-400 rounded-lg transition-all cursor-pointer border border-white/5"
                        >
                          <UserCheck size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-[#8B90A0] space-y-3">
                    <Users size={36} className="mx-auto text-white/20" />
                    <p className="text-xs">No friends added yet.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      className="px-4 py-2 bg-[#0070F3] hover:bg-[#005bb5] text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                    >
                      Find Friends Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SEARCH USERS */}
          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B90A0]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search listeners by username..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#8B90A0] focus:outline-none focus:border-[#0070F3]"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12 text-[#8B90A0]">
                    <Loader2 size={24} className="animate-spin text-[#0070F3]" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u) => {
                    const following = isFollowing(u.id);
                    const mutual = isMutualFriend(u.id);
                    return (
                      <div
                        key={u.id}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors border border-white/5"
                      >
                        <div
                          onClick={(e) => handleViewProfile(e, u.username, u.id)}
                          className="flex items-center gap-3 cursor-pointer group/search"
                          title="View profile"
                        >
                          <SafeAvatar src={u.avatar_url} alt="" sizeClassName="w-10 h-10" />
                          <div>
                            <div className="text-xs font-bold text-white group-hover/search:text-[#0070F3] transition-colors flex items-center gap-1">
                              {u.display_name}
                              {u.isVerified && <CheckCircle size={12} className="text-[#0070F3] fill-[#0070F3]" />}
                            </div>
                            <div className="text-[11px] text-[#8B90A0]">@{u.username}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFollowClick(e, u.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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

                          <button
                            type="button"
                            onClick={() => startChatWithUser(u.id, u.display_name, u.avatar_url)}
                            className="px-3 py-1.5 bg-[#0070F3] hover:bg-[#005bb5] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1"
                          >
                            <MessageSquare size={12} /> Chat
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : searchQuery ? (
                  <p className="text-center py-12 text-xs text-[#8B90A0]">No listeners found for "{searchQuery}"</p>
                ) : (
                  <div className="text-center py-16 text-[#8B90A0] space-y-2">
                    <Sparkles size={32} className="mx-auto text-[#0070F3]/60" />
                    <p className="text-xs">Type a username to discover & add friends</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHAT VIEW */}
          {activeTab === 'chats' && (
            activeConversationId && activeTargetUser ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Active Chat Target Header */}
                <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div
                    onClick={(e) => handleViewProfile(e, null, activeTargetUser.id)}
                    className="flex items-center gap-3 cursor-pointer group/user flex-1"
                    title="Click to view profile"
                  >
                    <div className="relative">
                      <SafeAvatar src={activeTargetUser.avatar} alt="" sizeClassName="w-9 h-9" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#101014]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover/user:text-[#0070F3] transition-colors">{activeTargetUser.name}</div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> View Profile →
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user?.id && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollowClick(e, activeTargetUser.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isMutualFriend(activeTargetUser.id)
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isFollowing(activeTargetUser.id)
                            ? 'bg-white/10 text-white'
                            : 'bg-[#0070F3] text-white hover:bg-[#005bb5]'
                        }`}
                      >
                        {isMutualFriend(activeTargetUser.id) ? (
                          <>
                            <UserCheck size={12} /> Friends 👥
                          </>
                        ) : isFollowing(activeTargetUser.id) ? (
                          <>
                            <UserCheck size={12} /> Following ✓
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} /> Follow
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversationId(null);
                        setActiveTargetUser(null);
                        fetchConversations();
                      }}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      ← Back
                    </button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 size={26} className="animate-spin text-[#0070F3]" />
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const isMusicTrack = msg.content.includes('🎵 Listening to:');

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          {isMusicTrack ? (
                            <div className="max-w-[85%] p-3 rounded-2xl bg-gradient-to-r from-[#0070F3]/20 via-purple-600/20 to-pink-600/20 border border-[#0070F3]/40 shadow-lg text-xs space-y-2">
                              <div className="flex items-center gap-2 text-[#0070F3] font-bold">
                                <Music size={14} /> Shared Track
                              </div>
                              <p className="text-white font-medium">{msg.content.replace('🎵 Listening to:', '').trim()}</p>
                            </div>
                          ) : (
                            <div
                              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-[#0070F3] text-white rounded-br-none shadow-md'
                                  : 'bg-[#202026] text-white border border-white/10 rounded-bl-none'
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}
                          <span className="text-[9px] text-[#8B90A0] mt-1 px-1 font-mono">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-[#8B90A0] space-y-2">
                      <MessageSquare size={32} className="mx-auto text-white/20" />
                      <p className="text-xs">No messages yet. Say hi!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#141419] space-y-2">
                  {currentSong && (
                    <button
                      type="button"
                      onClick={handleShareCurrentTrack}
                      className="w-full text-left px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] text-[#8B90A0] hover:text-white flex items-center justify-between transition-all border border-white/5 cursor-pointer"
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <Music size={12} className="text-[#0070F3]" />
                        <span>Share "{currentSong.title}"</span>
                      </span>
                      <span className="text-[10px] text-[#0070F3] font-bold">Share 🎵</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#8B90A0] focus:outline-none focus:border-[#0070F3]"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="w-9 h-9 rounded-xl bg-[#0070F3] hover:bg-[#005bb5] disabled:opacity-40 disabled:hover:bg-[#0070F3] text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Chat History</span>
                  <span className="text-[11px] text-[#8B90A0]">{conversations.length} Active</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {isLoadingConversations ? (
                    <div className="flex items-center justify-center py-16 text-[#8B90A0]">
                      <Loader2 size={24} className="animate-spin text-[#0070F3]" />
                    </div>
                  ) : conversations.length > 0 ? (
                    conversations.map((c) => (
                      <div
                        key={c.conversationId}
                        onClick={() => startChatWithUser(c.otherUser.id, c.otherUser.display_name, c.otherUser.avatar_url)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors border border-white/5 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            onClick={(e) => handleViewProfile(e, c.otherUser.username, c.otherUser.id)}
                            className="relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            title="View Profile"
                          >
                            <SafeAvatar src={c.otherUser.avatar_url} alt="" sizeClassName="w-10 h-10" />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#101014]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              onClick={(e) => handleViewProfile(e, c.otherUser.username, c.otherUser.id)}
                              className="text-xs font-bold text-white hover:text-[#0070F3] transition-colors truncate cursor-pointer"
                              title="View Profile"
                            >
                              {c.otherUser.display_name}
                            </div>
                            <div className="text-[11px] text-[#8B90A0] truncate max-w-[170px] mt-0.5">
                              {c.lastMessage ? c.lastMessage.content : 'Started a conversation'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0 gap-1">
                          <span className="text-[10px] text-[#8B90A0] font-mono">
                            {c.lastMessage ? new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          <span className="text-[11px] text-[#0070F3] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            Open →
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-[#8B90A0] space-y-3">
                      <MessageSquare size={36} className="mx-auto text-white/20" />
                      <p className="text-xs font-medium">No chat history yet.</p>
                      <p className="text-[11px] text-[#8B90A0] max-w-[200px] mx-auto">
                        Choose a friend from your Friends tab or search users to start a chat!
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('friends')}
                        className="px-4 py-2 bg-[#0070F3] hover:bg-[#005bb5] text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                      >
                        View Friends ({friends.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
