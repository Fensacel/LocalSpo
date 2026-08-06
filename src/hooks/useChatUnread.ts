import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChatService } from '@/services/chatService';
import { useChatStore } from '@/stores/useChatStore';

export function useChatUnread() {
  const { user } = useAuth();
  const setHasUnread = useChatStore((s) => s.setHasUnread);

  useEffect(() => {
    if (!user?.id) return;

    const unsub = ChatService.subscribeToUserMessages(user.id, () => {
      setHasUnread(true);
    });

    return () => unsub();
  }, [user?.id, setHasUnread]);
}
