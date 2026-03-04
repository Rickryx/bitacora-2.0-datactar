import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const WebhookManager: React.FC = () => {
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWebhook, setNewWebhook] = useState({ name: '', url: '' });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        setLoading(true);
        console.log("Fetching webhooks...");
        const { data, error } = await supabase.from('webhooks').select('*');
        if (data) {
            console.log("Webhooks data received:", data);
            setWebhooks(data);
        }
        if (error) {
            console.error("Supabase fetch error:", error);
            alert("Error al cargar webhooks: " + error.message);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newWebhook.name || !newWebhook.url) {
            alert("Por favor completa el nombre y la URL");
            return;
        }

        setLoading(true);
        console.log("Adding webhook:", newWebhook);

        try {
            const { data, error } = await supabase.from('webhooks').insert([
                { name: newWebhook.name, url: newWebhook.url, event_types: ['log.created'] }
            ]).select();

            if (error) {
                console.error("Supabase insert error:", error);
                alert("Error al añadir: " + error.message + " (Código: " + error.code + ")");
            } else {
                console.log("Webhook added successfully:", data);
                setNewWebhook({ name: '', url: '' });
                setIsAdding(false);
                await fetchWebhooks();
            }
        } catch (err) {
            console.error("Unexpected error adding webhook:", err);
            alert("Ocurrió un error inesperado al guardar.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este webhook?")) return;
        setLoading(true);
        const { error } = await supabase.from('webhooks').delete().eq('id', id);
        if (error) {
            console.error("Delete error:", error);
            alert("Error al eliminar: " + error.message);
        }
        else await fetchWebhooks();
        setLoading(false);
    };

    const toggleActive = async (id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('webhooks').update({ is_active: !current }).eq('id', id);
        if (error) {
            console.error("Update error:", error);
            alert("Error: " + error.message);
        }
        else await fetchWebhooks();
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800">Webhooks</h2>
                    <button onClick={fetchWebhooks} className="p-1 text-slate-300 hover:text-primary transition-colors">
                        <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-1 text-primary font-bold text-sm"
                    disabled={loading}
                >
                    <span className="material-symbols-outlined text-sm">{isAdding ? 'close' : 'add'}</span>
                    {isAdding ? 'Cancelar' : 'Añadir'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nombre del Servicio</label>
                        <input
                            placeholder="Ej: Zapier, Make, Slack"
                            className="w-full border-b border-slate-200 py-2 font-bold focus:outline-none focus:border-primary bg-transparent text-sm"
                            value={newWebhook.name}
                            onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">URL del Webhook (Terminal Destination)</label>
                        <input
                            placeholder="https://hooks.zapier.com/..."
                            className="w-full border-b border-slate-200 py-2 font-bold focus:outline-none focus:border-primary bg-transparent text-sm"
                            value={newWebhook.url}
                            onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={loading}
                        className={`w-full py-4 bg-primary text-white rounded-2xl font-black shadow-soft transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Guardando...' : 'Activar Webhook'}
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {webhooks.map(hook => (
                    <div key={hook.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 truncate">{hook.name}</h3>
                            <p className="text-xs text-slate-400 truncate font-mono">{hook.url}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => toggleActive(hook.id, hook.is_active)}
                                className={`w-10 h-6 rounded-full transition-colors relative ${hook.is_active ? 'bg-primary' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hook.is_active ? 'right-1' : 'left-1'}`} />
                            </button>
                            <button
                                onClick={() => handleDelete(hook.id)}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"
                            >
                                <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                        </div>
                    </div>
                ))}
                {!loading && webhooks.length === 0 && !isAdding && (
                    <p className="text-center py-4 text-slate-400 text-sm">No hay webhooks configurados</p>
                )}
            </div>
        </div>
    );
};

export default WebhookManager;
