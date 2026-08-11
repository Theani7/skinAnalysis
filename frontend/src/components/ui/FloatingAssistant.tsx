import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, X, Plus } from 'lucide-react';
import { streamSessionMessage, ChatMessage } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '../../contexts/ChatContext';

export default function FloatingAssistant() {
  const { messages, setMessages, isLoading, setIsLoading, activeSessionId, createNewChat, refreshSessions } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !activeSessionId) return;

    const userContent = input.trim();
    const userMessage: ChatMessage = { role: 'user', content: userContent };
    const newMessages = [...messages, userMessage];
    
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
          lastMsg.content = 'Sorry, I encountered an error.';
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[360px] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Header */}
          <div className="h-14 bg-primary-700 flex items-center justify-between px-4 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">SkinAI Assistant</h3>
                <p className="text-[10px] text-primary-100 opacity-90">Powered by AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={createNewChat}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' ? (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-primary-700" />
                      </div>
                    </div>
                    <div className="text-[13px] text-gray-700 pt-0.5 bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm w-full overflow-hidden prose prose-sm prose-primary max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-primary-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-primary-700" />
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-gray-500 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center bg-gray-50 border border-gray-200 rounded-full focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-300 transition-shadow">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-transparent border-0 text-gray-900 text-[13px] focus:ring-0 py-2.5 pl-4 pr-10"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !activeSessionId}
                className="absolute right-1.5 p-1.5 rounded-full text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-all flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-2">
              <p className="text-[9px] text-gray-400">Assistant can make mistakes. Consult a doctor.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-glow hover:shadow-glow-lg transition-all duration-300 ${
          isOpen ? 'bg-gray-800 rotate-90 scale-90 text-white' : 'bg-primary-700 hover:-translate-y-1 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6 -rotate-90" /> : (
          <div className="relative">
            <Bot className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 border-2 border-primary-700 rounded-full"></div>
          </div>
        )}
      </button>
    </div>
  );
}
