

import { useState, useRef, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { ChatMessage } from '../types';
import { MODULES } from '../constants';
import { getCoreTalkResponse } from '../services/geminiService';
import { SendIcon, CoreTalkIcon } from './icons';

const LOCAL_STORAGE_KEY = 'coretalk-messages';

const CoreTalk: FC = () => {
    const moduleInfo = MODULES.CoreTalk;
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedMessages) {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error("Failed to parse messages from localStorage:", error);
        }
        return [{ id: '1', text: "Hello! How can I help you connect today?", sender: 'ai', timestamp: new Date().toISOString() }];
    });

    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save messages to localStorage:", error);
        }
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: userInput.trim(),
            sender: 'user',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        // Prepare history for Gemini
        const history = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const aiResponseText = await getCoreTalkResponse(history, userInput.trim());
        
        const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: aiResponseText,
            sender: 'ai',
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent p-4 sm:p-6 md:p-8 overflow-hidden">
            <header className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500/20 rounded-lg flex items-center justify-center">
                        <moduleInfo.Icon className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{moduleInfo.name}</h1>
                        <p className="text-slate-400">{moduleInfo.description}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col bg-black/30 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden">
                {/* Chat Display */}
                <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-rose-500/50 flex items-center justify-center flex-shrink-0"><CoreTalkIcon className="w-5 h-5 text-rose-300"/></div>}
                            <div className={`max-w-md lg:max-w-lg px-4 py-2 rounded-xl transition-all ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none shadow-lg shadow-rose-500/10'}`}>
                                <p className="text-sm md:text-base">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start">
                             <div className="w-8 h-8 rounded-full bg-rose-500/50 flex items-center justify-center flex-shrink-0"><CoreTalkIcon className="w-5 h-5 text-rose-300"/></div>
                             <div className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 rounded-bl-none">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                             </div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-4">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Type or speak your message..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !userInput.trim()}
                            className="w-11 h-11 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full transition-colors flex items-center justify-center flex-shrink-0 disabled:bg-rose-800 disabled:cursor-not-allowed"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                    <div className="text-center text-xs text-slate-600 pt-2">Voice & Video chat modes are conceptual and will be available in a future update.</div>
                </div>
            </div>
        </div>
    );
};

export default CoreTalk;
