import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChatMessage } from '../services/api';

interface ChatContextType {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Hello! I am your SkinAI Assistant. How can I help you today with your skin concerns?'
  }]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ChatContext.Provider value={{ messages, setMessages, isLoading, setIsLoading }}>
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
