import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { explainConcept, preloadTextModel } from '../services/ai';
import { api } from '../services/api';

interface ExplainerProps {
  onInteraction?: () => void;
}

const SUGGESTIONS = [
  "Explain Big O notation with examples",
  "How does the Event Loop work in JavaScript?",
  "What is the difference between TCP and UDP?",
  "Explain Dependency Injection",
  "How does a Blockchain work?",
  "What are Microservices?",
];

const Explainer: React.FC<ExplainerProps> = ({ onInteraction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm ALLYMIND, your AI Study Buddy. I can explain any concept, simplify your notes, or help you brainstorm ideas. What are we learning today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([]);

  // Proactive preload on mount
  useEffect(() => {
    preloadTextModel();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (forcedInput?: string) => {
    const textToSend = forcedInput || input.trim();
    if (!textToSend || isTyping) return;

    setInput('');
    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    conversationHistoryRef.current.push(userMessage);
    setIsTyping(true);
    setIsModelLoading(true); // Show warming up initially
    if (onInteraction) onInteraction();

    // Create a placeholder for the assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    let fullResponse = '';

    try {
      try {
        fullResponse = await api.getChatFromBackend(textToSend);
        if (isModelLoading) setIsModelLoading(false);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
          return updated;
        });
      } catch (backendErr) {
        console.warn('Backend chat failed, using Ollama proxy', backendErr);
        const context = conversationHistoryRef.current
          .slice(0, -1)
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        await explainConcept(textToSend, context, (token) => {
          if (isModelLoading) setIsModelLoading(false);
          fullResponse += token;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
            return updated;
          });
        });
      }
      conversationHistoryRef.current.push({ role: 'assistant', content: fullResponse });
    } catch (error) {
      console.error("Explainer error:", error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: "Oops! Could not reach the backend or Ollama. Ensure you're logged in and the backend is running." };
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear this conversation history?")) {
      conversationHistoryRef.current = [];
      setMessages([{ role: 'assistant', content: "Fresh start! What concept should we tackle now?" }]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col space-y-4">
      <header className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">Study Chatbot</h2>
        </div>
        <button onClick={clearChat} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </header>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'}`}>
                <div className="prose prose-sm max-w-none leading-relaxed">
                  {msg.content ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    isTyping && idx === messages.length - 1 ? (
                      <span className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        {isModelLoading && <span className="ml-2 text-slate-400 text-xs font-medium animate-pulse">Warming up AI...</span>}
                      </span>
                    ) : ""
                  )}
                </div>
              </div>
            </div>
          ))}
          {messages.length < 3 && !isTyping && (
            <div className="flex flex-wrap gap-2 mt-4">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium border border-indigo-100">{s}</button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white pt-10">
          <div className="relative max-w-3xl mx-auto">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask follow-up..." className="w-full pl-6 pr-14 py-4 rounded-2xl border focus:border-indigo-500 shadow-xl outline-none text-slate-700 bg-white" />
            <button onClick={() => handleSend()} disabled={isTyping || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl disabled:bg-slate-200">
              {isTyping ? "..." : ">"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explainer;
