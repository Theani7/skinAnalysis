import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ChatMessage, ChatSession, getChatSessions, createChatSession, getChatMessages } from '../services/api';

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  createNewChat: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Hello! I am your SkinAI Assistant. How can I help you today with your skin concerns?'
  }]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSessions = async () => {
    try {
      const fetchedSessions = await getChatSessions();
      setSessions(fetchedSessions);
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
    }
  };

  useEffect(() => {
    const initSessions = async () => {
      try {
        const fetchedSessions = await getChatSessions();
        if (fetchedSessions.length === 0) {
          const newSession = await createChatSession();
          setSessions([newSession]);
          setActiveSessionId(newSession.id);
        } else {
          setSessions(fetchedSessions);
          setActiveSessionId(fetchedSessions[0].id);
          const history = await getChatMessages(fetchedSessions[0].id);
          if (history.length > 0) {
             setMessages(history);
          }
        }
      } catch (err) {
        console.error('Failed to init sessions:', err);
      }
    };
    initSessions();
  }, []);

  const createNewChat = async () => {
    try {
      const newSession = await createChatSession();
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([{
        role: 'assistant',
        content: 'Hello! I am your SkinAI Assistant. How can I help you today with your skin concerns?'
      }]);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const selectSession = async (id: string) => {
    try {
      setActiveSessionId(id);
      const history = await getChatMessages(id);
      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Hello! I am your SkinAI Assistant. How can I help you today with your skin concerns?'
        }]);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      sessions, 
      activeSessionId, 
      messages, 
      setMessages, 
      isLoading, 
      setIsLoading, 
      createNewChat, 
      selectSession,
      refreshSessions
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
