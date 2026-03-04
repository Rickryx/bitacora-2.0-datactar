import React, { useState, useRef, useEffect } from 'react';
import { queryLogsWithAI } from '../services/openaiService';
import { supabase } from '../services/supabase';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const AdminChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hola Administrador, soy tu asistente de Bitácora. ¿Qué deseas consultar hoy sobre los registros?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            // Fetch recent logs for context
            const { data: logs } = await supabase
                .from('logs')
                .select('*, entities(name)')
                .order('created_at', { ascending: false })
                .limit(50);

            const response = await queryLogsWithAI(userMessage, logs || []);
            setMessages(prev => [...prev, { role: 'assistant', content: response || 'No pude procesar tu consulta.' }]);
        } catch (error) {
            console.error("Error in AdminChat:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al conectar con el asistente.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] max-w-[calc(100vw-48px)] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-xl bg-blue-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">smart_toy</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-black tracking-tight">Bitácora AI</h4>
                                <p className="text-[10px] opacity-70 font-medium tracking-wide">Asistente Administrativo</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 h-[400px] overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                                        ? 'bg-primary text-white font-medium shadow-lg shadow-primary/10 rounded-tr-none'
                                        : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-none font-medium'
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                    <div className="size-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                    <div className="size-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                                    <div className="size-1.5 bg-slate-300 rounded-full animate-bounce delay-300"></div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            placeholder="Pregúntame algo..."
                            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isOpen ? 'bg-slate-900 text-white rotate-180' : 'bg-primary text-white hover:scale-105'
                    }`}
            >
                <span className="material-symbols-outlined !text-3xl">
                    {isOpen ? 'close' : 'forum'}
                </span>
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                )}
            </button>
        </div>
    );
};

export default AdminChat;
