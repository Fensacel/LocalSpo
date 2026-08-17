import { create } from 'zustand';
import type { ChatConversation, ChatMessage, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface ChatStore {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  loading: boolean;
  fetchConversations: (userId: string) => Promise<void>;
  openConversation: (userId: string, otherUser: Profile) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => () => void;
  setActiveConversation: (conv: ChatConversation | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,

  fetchConversations: async (userId) => {
    set({ loading: true });
    const { data: partData } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!partData || partData.length === 0) { set({ loading: false }); return; }

    const convIds = partData.map((p: { conversation_id: string }) => p.conversation_id);
    const { data: convData } = await supabase
      .from('chat_conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    set({ conversations: convData || [], loading: false });
  },

  openConversation: async (userId, otherUser) => {
    // Find existing conversation between two users
    const { data: myParts } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    const { data: theirParts } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', otherUser.id);

    const myIds = new Set((myParts || []).map((p: { conversation_id: string }) => p.conversation_id));
    const shared = (theirParts || []).find((p: { conversation_id: string }) => myIds.has(p.conversation_id));

    let conversationId: string;

    if (shared) {
      conversationId = shared.conversation_id;
    } else {
      // Create new conversation
      const { data: conv } = await supabase
        .from('chat_conversations')
        .insert({ created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
      conversationId = conv.id;

      await supabase.from('chat_participants').insert([
        { conversation_id: conversationId, user_id: userId },
        { conversation_id: conversationId, user_id: otherUser.id },
      ]);
    }

    // Fetch messages
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at');

    const conv: ChatConversation = {
      id: conversationId,
      participants: [otherUser],
      updatedAt: new Date().toISOString(),
    };

    set({
      activeConversation: conv,
      messages: (msgs || []) as ChatMessage[],
    });
  },

  sendMessage: async (conversationId, senderId, content) => {
    const { data } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (data) {
      set((s) => ({ messages: [...s.messages, data as ChatMessage] }));
    }
  },

  subscribeToMessages: (conversationId) => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          set((s) => {
            if (s.messages.some((m) => m.id === msg.id)) return s;
            return { messages: [...s.messages, msg] };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  setActiveConversation: (conv) => set({ activeConversation: conv, messages: [] }),
}));
