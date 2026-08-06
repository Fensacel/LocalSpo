import { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { ChatService, type ChatMessage } from '@/services/chatService';
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
  const { user, profile } = useAuth();
  const currentSong = usePlayerStore((s) => s.currentSong);

  const { friends, fetchFriends, toggleFriend, isFriend, clearUnread } = useChatStore();

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

  // Clear unread when drawer opens
  useEffect(() => {
    if (isOpen) {
      clearUnread();
      if (user?.id) {
        fetchFriends(user.id);
      }
    }
  }, [isOpen, user?.id, clearUnread, fetchFriends]);

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

  const handleToggleFriendClick = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    if (!user?.id) return;
    await toggleFriend(user.id, friendId);
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
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <SafeAvatar src={f.avatar_url} alt="" sizeClassName="w-10 h-10" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#101014]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1">
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
                          onClick={(e) => handleToggleFriendClick(e, f.id)}
                          title="Remove Friend"
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
                    const friended = isFriend(u.id);
                    return (
                      <div
                        key={u.id}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <SafeAvatar src={u.avatar_url} alt="" sizeClassName="w-10 h-10" />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                              {u.display_name}
                              {u.isVerified && <CheckCircle size={12} className="text-[#0070F3] fill-[#0070F3]" />}
                            </div>
                            <div className="text-[11px] text-[#8B90A0]">@{u.username}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFriendClick(e, u.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              friended
                                ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                          >
                            {friended ? <UserCheck size={13} /> : <UserPlus size={13} />}
                            <span>{friended ? 'Friend' : 'Add'}</span>
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
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <SafeAvatar src={activeTargetUser.avatar} alt="" sizeClassName="w-9 h-9" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#101014]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{activeTargetUser.name}</div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user?.id && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFriendClick(e, activeTargetUser.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isFriend(activeTargetUser.id)
                            ? 'bg-white/10 text-white'
                            : 'bg-[#0070F3] text-white hover:bg-[#005bb5]'
                        }`}
                      >
                        {isFriend(activeTargetUser.id) ? <UserCheck size={12} /> : <UserPlus size={12} />}
                        <span>{isFriend(activeTargetUser.id) ? 'Friends ✓' : 'Add Friend'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversationId(null);
                        setActiveTargetUser(null);
                      }}
                      className="text-xs text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
                    >
                      Close
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
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8B90A0] space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#0070F3]/10 flex items-center justify-center text-[#0070F3]">
                  <MessageSquare size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">No Chat Selected</h3>
                  <p className="text-xs text-[#8B90A0] mt-1 max-w-xs">
                    Choose a friend from your Friends tab or search users to start a message.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  className="px-4 py-2 bg-[#0070F3] hover:bg-[#005bb5] text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                >
                  View Friends
                </button>
              </div>
            )
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
