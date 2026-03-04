import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { NexusConfig } from '../types';

interface NexusConfigPanelProps {
  entityId: string;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  VISITOR: 'Visitante',
  INCIDENT: 'Incidente',
  ROUND: 'Ronda',
  PACKAGE: 'Encomienda',
  INVOICE: 'Factura',
};

const NexusConfigPanel: React.FC<NexusConfigPanelProps> = ({ entityId }) => {
  const [config, setConfig] = useState<NexusConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [form, setForm] = useState({
    nexus_endpoint: 'https://tzgnhbexeyyrmgrcyjvo.supabase.co/functions/v1/bridge',
    api_key: ''
  });

  useEffect(() => {
    fetchConfig();
    fetchRecentEvents();
  }, [entityId]);

  const fetchRecentEvents = async () => {
    const { data } = await supabase
      .from('logs')
      .select('id, type, title, created_at')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentEvents(data);
  };

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nexus_config')
      .select('*')
      .eq('entity_id', entityId)
      .maybeSingle();

    if (data) setConfig(data);
    else setConfig(null);
    setLoading(false);
  };

  const handleTestConnection = async () => {
    const endpoint = form.nexus_endpoint || config?.nexus_endpoint;
    const key = form.api_key || config?.api_key;
    if (!endpoint || !key) {
      setTestResult({ ok: false, message: 'Completa endpoint y API key' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      // Route through server-side proxy — avoids CORS and uses correct Supabase gateway auth
      const res = await fetch('/api/nexus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexus_endpoint: endpoint, api_key: key, test: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({ ok: true, message: `Conexión exitosa (HTTP ${res.status})` });
      } else {
        setTestResult({ ok: false, message: data.error || `Error HTTP ${res.status}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.nexus_endpoint || !form.api_key) {
      alert('Completa todos los campos');
      return;
    }

    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase
          .from('nexus_config')
          .update({
            nexus_endpoint: form.nexus_endpoint,
            api_key: form.api_key,
            is_active: true,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('nexus_config')
          .insert({
            entity_id: entityId,
            nexus_endpoint: form.nexus_endpoint,
            api_key: form.api_key,
            is_active: true,
          })
          .select()
          .single();
        if (error) {
          console.error('Error inserting nexus_config:', error);
          throw error;
        }
        console.log('Nexus config inserted successfully:', inserted);
      }
      setIsEditing(false);
      await fetchConfig();
    } catch (err: any) {
      console.error('Supabase operation failed:', err);
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!config) return;
    await supabase
      .from('nexus_config')
      .update({ is_active: !config.is_active, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    await fetchConfig();
  };

  const handleDisconnect = async () => {
    if (!config) return;
    if (!confirm('¿Desconectar Nexus? Los logs dejarán de sincronizarse.')) return;
    await supabase.from('nexus_config').delete().eq('id', config.id);
    setConfig(null);
    setForm({ nexus_endpoint: 'https://tzgnhbexeyyrmgrcyjvo.supabase.co/functions/v1/bridge', api_key: '' });
    setTestResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-slate-300">progress_activity</span>
      </div>
    );
  }

  // Show form if no config or editing
  if (!config || isEditing) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Nexus Endpoint
            </label>
            <p className="text-[10px] text-slate-400 mb-2">URL del bridge de Datactar. Normalmente no necesitas cambiar este valor.</p>
            <input
              placeholder="https://xxx.supabase.co/functions/v1/bridge"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-xs font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={form.nexus_endpoint}
              onChange={e => setForm({ ...form, nexus_endpoint: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              API Key
            </label>
            <p className="text-[10px] text-slate-400 mb-2">El key que te entregó tu fuente Nexus (empieza con <code className="bg-slate-100 px-1 rounded">dc_live_</code>).</p>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="dc_live_..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 font-mono text-xs font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={form.api_key}
                onChange={e => setForm({ ...form, api_key: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined !text-lg">{showKey ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <span className="material-symbols-outlined text-sm shrink-0">
                {testResult.ok ? 'check_circle' : 'error'}
              </span>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.api_key}
              className="flex-1 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-soft transition-all active:scale-95 disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Activar'}
            </button>
          </div>

          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="w-full py-2 text-slate-400 text-sm font-bold"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show status view when config exists
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">hub</span>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Conexión con Nexus</h2>
            <p className="text-xs text-slate-400">Conecta esta entidad con su cerebro centralizado</p>
          </div>
        </div>
        <button
          onClick={fetchConfig}
          className="p-1 text-slate-300 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {/* Connection status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${config.is_active && !config.last_error ? 'bg-green-500' : config.last_error ? 'bg-red-500' : 'bg-slate-300'}`} />
            <span className="text-sm font-bold text-slate-900">
              {config.is_active && !config.last_error ? 'Conectado' : config.last_error ? 'Error' : 'Pendiente de Configuración'}
            </span>
          </div>
          {!config.api_key && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-tighter"
            >
              Configurar Ahora
            </button>
          )}
          {config.api_key && (
            <button
              onClick={handleToggleActive}
              className={`w-10 h-6 rounded-full transition-colors relative ${config.is_active ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.is_active ? 'right-1' : 'left-1'}`} />
            </button>
          )}
        </div>

        {/* Endpoint */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Endpoint</label>
          <p className="text-xs text-slate-600 font-mono truncate">{config.nexus_endpoint}</p>
        </div>

        {/* API Key masked */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">API Key</label>
          <p className="text-xs text-slate-600 font-mono">{config.api_key ? config.api_key.slice(0, 10) + '••••••••••••' : '—'}</p>
        </div>

        {/* Last sync */}
        {config.last_sync_at && (
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Último Sync</label>
            <p className="text-xs text-slate-600">{new Date(config.last_sync_at).toLocaleString()}</p>
          </div>
        )}

        {/* Last error */}
        {config.last_error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100">
            <label className="text-[10px] font-black text-red-400 uppercase tracking-wider">Último Error</label>
            <p className="text-xs text-red-600 font-mono">{config.last_error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setForm({ nexus_endpoint: config.nexus_endpoint, api_key: config.api_key });
              setIsEditing(true);
            }}
            className="flex-1 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm align-middle mr-1">edit</span>
            Editar
          </button>
          <button
            onClick={handleDisconnect}
            className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm align-middle mr-1">link_off</span>
            Desconectar
          </button>
        </div>
      </div>

      {/* Recent events synced */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eventos recientes sincronizados</p>
          <button onClick={fetchRecentEvents} className="text-slate-300 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Sin eventos registrados aún</p>
        ) : (
          <div className="space-y-1.5">
            {recentEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-primary text-base shrink-0">sync</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{ev.title}</p>
                  <p className="text-[10px] text-slate-400">{EVENT_TYPE_LABEL[ev.type] || ev.type} · {new Date(ev.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NexusConfigPanel;
