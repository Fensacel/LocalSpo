import { supabase } from '@/lib/supabase';
import type { UserProfile } from './profileService';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface UserConversationItem {
  conversationId: string;
  otherUser: UserProfile;
  lastMessage: ChatMessage | null;
  updatedAt: string;
}

export class ChatService {
  /** Create or get conversation between users */
  public static async getOrCreateConversation(userId: string, targetUserId: string): Promise<string | null> {
    try {
      // Find existing 1-on-1 conversation
      const { data: userConvs } = await supabase
        .from('participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (userConvs && userConvs.length > 0) {
        const convIds = userConvs.map((c) => c.conversation_id);
        const { data: targetMatch } = await supabase
          .from('participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', convIds)
          .maybeSingle();

        if (targetMatch) return targetMatch.conversation_id;
      }

      // Create new conversation with explicit UUID
      const newConvId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          id: newConvId,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (convErr) {
        console.error('[ChatService] conversations insert error:', convErr);
        const { error: fallbackErr } = await supabase
          .from('conversations')
          .insert({ id: newConvId, created_at: now, updated_at: now });

        if (fallbackErr) {
          console.error('[ChatService] fallback conversations insert error:', fallbackErr);
          return null;
        }
      }

      const finalConvId = newConv?.id || newConvId;

      const { error: partErr } = await supabase.from('participants').insert([
        { conversation_id: finalConvId, user_id: userId },
        { conversation_id: finalConvId, user_id: targetUserId },
      ]);

      if (partErr) {
        console.warn('[ChatService] insert participants warning:', partErr.message);
      }

      return finalConvId;
    } catch (err) {
      console.error('[ChatService] getOrCreateConversation error:', err);
      return null;
    }
  }

  /** Send chat message */
  public static async sendMessage(conversationId: string, senderId: string, content: string): Promise<ChatMessage> {
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    const optimisticMessage: ChatMessage = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      created_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[ChatService] sendMessage insert error:', error.message, error.details);
      } else if (data) {
        console.log('[ChatService] Message successfully inserted to Supabase:', data);
        return data as ChatMessage;
      }
      return optimisticMessage;
    } catch (err) {
      console.error('[ChatService] sendMessage exception:', err);
      return optimisticMessage;
    }
  }

  /** Fetch messages for conversation */
  public static async getMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error || !data) return [];
      return data as ChatMessage[];
    } catch (err) {
      console.error('[ChatService] getMessages error:', err);
      return [];
    }
  }

  /** Subscribe to all incoming chat messages for user unread notifications */
  public static subscribeToUserMessages(userId: string, onNewMessage: (msg: ChatMessage) => void): () => void {
    if (!userId) return () => {};
    const channel = supabase
      .channel(`user_messages_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.sender_id !== userId) {
            onNewMessage(newMsg);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /** Subscribe to new messages in conversation */
  public static subscribeToMessages(conversationId: string, callback: (newMsg: ChatMessage) => void): () => void {
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /** Fetch active chat conversations list for user (Chat History) */
  public static async getUserConversations(userId: string): Promise<UserConversationItem[]> {
    if (!userId) return [];
    try {
      const { data: myParticipants, error: partErr } = await supabase
        .from('participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (partErr || !myParticipants || myParticipants.length === 0) return [];
      const convIds = myParticipants.map((p) => p.conversation_id);

      const { data: allParticipants, error: allErr } = await supabase
        .from('participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)
        .neq('user_id', userId);

      if (allErr || !allParticipants || allParticipants.length === 0) return [];

      const result: UserConversationItem[] = [];

      for (const p of allParticipants) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', p.user_id)
          .maybeSingle();

        if (!profileData) continue;

        const { data: lastMsgData } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', p.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        result.push({
          conversationId: p.conversation_id,
          otherUser: profileData as UserProfile,
          lastMessage: lastMsgData as ChatMessage | null,
          updatedAt: lastMsgData?.created_at || new Date().toISOString(),
        });
      }

      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return result;
    } catch (err) {
      console.error('[ChatService] getUserConversations error:', err);
      return [];
    }
  }
}
