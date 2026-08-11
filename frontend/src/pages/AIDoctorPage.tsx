import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Info, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { streamSessionMessage, ChatMessage } from '../services/api';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '../contexts/ChatContext';

export default function AIDoctorPage() {
  const { messages, setMessages, isLoading, setIsLoading, sessions, activeSessionId, createNewChat, selectSession, refreshSessions, deleteChat } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px'; // default height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !activeSessionId) return;

    const userContent = input.trim();
    const userMessage: ChatMessage = { role: 'user', content: userContent };
    const newMessages = [...messages, userMessage];
    
    // Add an empty assistant message to stream into
    const initialAssistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...newMessages, initialAssistantMessage]);
    
    setInput('');
    setIsLoading(true);

    try {
      await streamSessionMessage(activeSessionId, userContent, (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            // MUST clone the message to avoid StrictMode double-mutation
            updated[updated.length - 1] = { ...lastMsg, content: lastMsg.content + chunk };
          }
          return updated;
        });
      });
      
      if (messages.length <= 1) {
        // Wait for the backend AI title generation background task to finish
        setTimeout(() => {
          refreshSessions();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '') {
          updated[updated.length - 1] = { ...lastMsg, content: 'Sorry, I encountered an error while processing your request.' };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] lg:h-screen relative bg-white overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 shrink-0 bg-gray-50 border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg py-2.5 px-4 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              <button
                onClick={() => selectSession(session.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors text-sm pr-10 ${
                  activeSessionId === session.id 
                    ? 'bg-primary-100 text-primary-900 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === session.id ? 'text-primary-700' : 'text-gray-400'}`} />
                <span className="truncate">{session.title || 'New Conversation'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(session.id);
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 ${activeSessionId === session.id ? 'opacity-100' : ''}`}
                title="Delete Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-center z-10 md:justify-start md:px-6">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary-700" />
            SkinAI Assistant
          </h1>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pt-20 pb-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            
            {/* Disclaimer */}
            <div className="flex justify-center mb-10 mt-4">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs sm:text-sm text-gray-500 max-w-xl text-center">
                <Info className="w-4 h-4 shrink-0 text-gray-400" />
                <span>SkinAI Assistant can make mistakes. For serious medical concerns, please consult a certified dermatologist.</span>
              </div>
            </div>

            <div className="space-y-8">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="flex gap-4 max-w-[90%] sm:max-w-[85%]">
                      <div className="shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
                          <Bot className="w-4.5 h-4.5 text-primary-700" />
                        </div>
                      </div>
                      <div className="text-[15px] text-gray-700 pt-1.5 w-full overflow-hidden prose prose-sm prose-primary max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] sm:max-w-[75%] bg-gray-100 text-gray-900 rounded-3xl rounded-tr-sm px-5 py-3.5 text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex w-full justify-start">
                  <div className="flex gap-4 max-w-[85%]">
                    <div className="shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
                        <Bot className="w-4.5 h-4.5 text-primary-700" />
                      </div>
                    </div>
                    <div className="pt-2 flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span>Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-6 lg:pb-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <form onSubmit={handleSend} className="relative flex items-end shadow-sm border border-gray-200 rounded-3xl bg-white overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-300">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your skin..."
                className="w-full bg-transparent border-0 text-gray-900 text-[15px] focus:ring-0 resize-none py-4 pl-6 pr-14 block max-h-[200px]"
                style={{ minHeight: '56px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !activeSessionId}
                className="absolute right-2 bottom-2 p-2.5 rounded-full text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all flex items-center justify-center m-0.5"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[11px] text-gray-400">SkinAI may produce inaccurate information about people, places, or facts.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
