
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, EventType, LogEntry, User } from './types';
import { supabase } from './services/supabase';
import LoginView from './views/LoginView';
import WelcomeView from './views/WelcomeView';
import DashboardView from './views/DashboardView';
import MinutaView from './views/MinutaView';
import SettingsView from './views/SettingsView';
import VisitorFormView from './views/VisitorFormView';
import IncidentFormView from './views/IncidentFormView';
import RoundFormView from './views/RoundFormView';
import AdminView from './views/AdminView';
import ConfirmationView from './views/ConfirmationView';
import PackageFormView from './views/PackageFormView';
import FacturaBatchView from './views/FacturaBatchView';
import FacturaEntregaView from './views/FacturaEntregaView';
import EncomiendaHubView from './views/EncomiendaHubView';
import VoiceInterface from './components/VoiceInterface';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visitors: 0, rounds: 0, incidents: 0 });

  // Initialize Auth and Realtime
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile?.role === 'ADMIN' || profile?.role === 'COORDINATOR') {
          setCurrentView(AppView.ADMIN);
        } else {
          setCurrentView(AppView.WELCOME);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile?.role === 'ADMIN' || profile?.role === 'COORDINATOR') {
          setCurrentView(AppView.ADMIN);
        } else {
          setCurrentView(AppView.WELCOME);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentView(AppView.LOGIN);
        setActiveShift(null);
        setLogs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch active shift whenever user changes
  useEffect(() => {
    if (user) {
      checkActiveShift();
    }
  }, [user?.id]);

  const checkActiveShift = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*, entities(name)')
      .eq('user_id', user?.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    setActiveShift(data);
    if (data) fetchStats(data.entity_id);
  };

  const fetchStats = async (entityId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: visitorsCount } = await supabase
      .from('logs')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('type', 'VISITOR')
      .gte('created_at', today.toISOString());

    const { count: roundsCount } = await supabase
      .from('logs')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('type', 'ROUND')
      .gte('created_at', today.toISOString());

    const { count: incidentsCount } = await supabase
      .from('logs')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('type', 'INCIDENT')
      .gte('created_at', today.toISOString());

    setStats({
      visitors: visitorsCount || 0,
      rounds: roundsCount || 0,
      incidents: incidentsCount || 0
    });
  };

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch warning:', error.message);
      }

      const profileData = data || {};

      const newUser: User = {
        id: userId,
        name: profileData.full_name || 'Guardia (Sin Perfil)',
        location: 'Consultando...',
        turn: 'Consultando...',
        avatarUrl: profileData.avatar_url || 'https://ui-avatars.com/api/?name=Guard',
        role: (['ADMIN', 'COORDINATOR'].includes(profileData.role) ? profileData.role : 'GUARD') as User['role']
      };

      setUser(newUser);
      return newUser;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  };

  // Realtime Logs Subscription
  useEffect(() => {
    if (!user || !activeShift) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      // ONLY fetch logs for the active entity
      const { data } = await supabase
        .from('logs')
        .select('*')
        .eq('entity_id', activeShift.entity_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setLogs(data.map(mapSupabaseLogToEntry));
      }
    };

    fetchLogs();

    const channel = supabase
      .channel('public:logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs', filter: `entity_id=eq.${activeShift.entity_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLogs((prev) => {
              if (prev.some(log => log.id === payload.new.id)) return prev;
              return [mapSupabaseLogToEntry(payload.new), ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setLogs(prev => prev.map(log =>
              log.id === payload.new.id ? mapSupabaseLogToEntry(payload.new) : log
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeShift]);

  const mapSupabaseLogToEntry = (dbLog: any): LogEntry => ({
    id: dbLog.id,
    timestamp: new Date(dbLog.created_at),
    occurredAt: new Date(dbLog.occurred_at || dbLog.created_at),
    type: dbLog.type as EventType,
    title: dbLog.title,
    subtitle: dbLog.subtitle || '',
    description: dbLog.description,
    status: dbLog.status,
    details: dbLog.details || {},
    imageUrl: dbLog.media_urls?.[0],
    document_id: dbLog.document_id,
    critical_level: dbLog.critical_level,
    signature_url: dbLog.signature_url
  });

  const startTurn = () => {
    setCurrentView(AppView.DASHBOARD);
  };

  const endShift = async () => {
    if (!activeShift) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'COMPLETED',
          actual_end: new Date().toISOString()
        })
        .eq('id', activeShift.id);

      if (error) throw error;

      setActiveShift(null);
      setCurrentView(AppView.WELCOME);
    } catch (e: any) {
      alert(`Error al finalizar turno: ${e.message}`);
    }
  };

  const addLog = async (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>) => {
    if (!activeShift) {
      alert("Debes tener un turno activo para registrar eventos.");
      return;
    }

    try {
      const { data, error } = await supabase.from('logs').insert({
        user_id: user?.id,
        entity_id: activeShift.entity_id, // CRITICAL: Link to active entity
        type: entry.type,
        title: entry.title,
        subtitle: entry.subtitle,
        description: entry.description,
        status: 'ABIERTO',
        document_id: entry.document_id,
        critical_level: entry.critical_level,
        signature_url: entry.signature_url,
        details: entry.details || {},
        media_urls: entry.imageUrl ? [entry.imageUrl] : [],
        occurred_at: entry.occurredAt || new Date()
      })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newLog = mapSupabaseLogToEntry(data);
        setLogs(prev => [newLog, ...prev]);
        triggerWebhooks(data); // Trigger webhooks after saving
        pushToNexus(data); // Push to Nexus if configured
      }

      setCurrentView(AppView.MINUTA);
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    }
  };

  const triggerWebhooks = async (logData: any) => {
    try {
      const { data: webhooks } = await supabase
        .from('webhooks')
        .select('*')
        .eq('is_active', true);

      if (!webhooks || webhooks.length === 0) return;

      const payload = {
        event: 'log.created',
        timestamp: new Date().toISOString(),
        data: logData
      };

      // Send to all active webhooks
      webhooks.forEach(webhook => {
        fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error(`Webhook ${webhook.name} failed:`, err));
      });
    } catch (err) {
      console.error('Error triggering webhooks:', err);
    }
  };

  const pushToNexus = async (logData: any) => {
    if (!activeShift?.entity_id) return;

    try {
      const { data: config } = await supabase
        .from('nexus_config')
        .select('nexus_endpoint, api_key, is_active')
        .eq('entity_id', activeShift.entity_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!config) return;

      const response = await fetch('/api/nexus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log: logData,
          nexus_endpoint: config.nexus_endpoint,
          api_key: config.api_key
        })
      });

      if (!response.ok) {
        await supabase.from('nexus_config')
          .update({ last_error: `HTTP ${response.status}`, updated_at: new Date().toISOString() })
          .eq('entity_id', activeShift.entity_id);
      } else {
        await supabase.from('nexus_config')
          .update({ last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
          .eq('entity_id', activeShift.entity_id);
      }
    } catch (err) {
      console.error('Nexus push failed (non-blocking):', err);
    }
  };

  const updateLog = async (id: string, updates: any) => {
    try {
      const { error } = await supabase.from('logs').update(updates).eq('id', id);
      if (error) throw error;
      setLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    } catch (e: any) {
      alert(`Error al actualizar: ${e.message}`);
    }
  };

  const handleVoiceProcess = (processedData: any) => {
    setPendingEvent(processedData);
    setIsVoiceActive(false);
    setCurrentView(AppView.CONFIRMATION);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.LOGIN:
        return <LoginView onLogin={() => { }} />; /* No op, waiting for auth state change */
      case AppView.WELCOME:
        return <WelcomeView user={user!} onStartTurn={startTurn} stats={stats} activeShift={activeShift} />;
      case AppView.DASHBOARD: {
        const pendingPackagesCount = logs.filter(l => l.type === EventType.ENCOMIENDA && l.status === 'ABIERTO').length;
        return (
          <DashboardView
            user={user!}
            onNavigate={setCurrentView}
            onVoiceClick={() => setIsVoiceActive(true)}
            pendingPackagesCount={pendingPackagesCount}
          />
        );
      }
      case AppView.MINUTA:
        return (
          <MinutaView
            logs={logs}
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onNavigate={setCurrentView}
            onVoiceClick={() => setIsVoiceActive(true)}
            onUpdateLog={updateLog}
          />
        );
      case AppView.SETTINGS:
        return (
          <SettingsView
            user={user!}
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onLogout={() => setCurrentView(AppView.LOGIN)}
            onNavigate={setCurrentView}
            onEndShift={endShift}
            activeShift={activeShift}
          />
        );
      case AppView.ADMIN:
        return <AdminView user={user!} onNavigate={setCurrentView} />;
      case AppView.VISITOR_FORM:
        return <VisitorFormView onBack={() => setCurrentView(AppView.DASHBOARD)} onSubmit={addLog} />;
      case AppView.PACKAGE_FORM:
        return <PackageFormView onBack={() => setCurrentView(AppView.DASHBOARD)} onSubmit={addLog} />;
      case AppView.FACTURA_BATCH_FORM:
        return <FacturaBatchView onBack={() => setCurrentView(AppView.DASHBOARD)} onSubmit={addLog} />;
      case AppView.FACTURA_ENTREGA_FORM:
        return <FacturaEntregaView onBack={() => setCurrentView(AppView.MINUTA)} onSubmit={addLog} />;
      case AppView.ENCOMIENDAS_HUB:
        return (
          <EncomiendaHubView
            logs={logs}
            onNavigate={setCurrentView}
            onVoiceClick={() => setIsVoiceActive(true)}
            onUpdateLog={updateLog}
          />
        );
      case AppView.INCIDENT_FORM:
        return <IncidentFormView onBack={() => setCurrentView(AppView.DASHBOARD)} onSubmit={addLog} />;
      case AppView.ROUND_FORM:
        return (
          <RoundFormView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onSubmit={addLog}
            onVoiceClick={() => setIsVoiceActive(true)}
          />
        );
      case AppView.CONFIRMATION:
        return (
          <ConfirmationView
            data={pendingEvent}
            onConfirm={(finalData) => {
              addLog(finalData);
              setPendingEvent(null);
            }}
            onCancel={() => {
              setPendingEvent(null);
              setCurrentView(AppView.DASHBOARD);
            }}
          />
        );
      default:
        return <DashboardView user={user!} onNavigate={setCurrentView} onVoiceClick={() => setIsVoiceActive(true)} />;
    }
  };

  const isAdminView = currentView === AppView.ADMIN;

  return (
    <div className={isAdminView
      ? "min-h-screen bg-slate-50"
      : "min-h-screen flex flex-col relative max-w-md mx-auto bg-white shadow-2xl overflow-hidden"
    }>
      {renderView()}

      {isVoiceActive && (
        <VoiceInterface
          onClose={() => setIsVoiceActive(false)}
          onProcess={handleVoiceProcess}
        />
      )}
    </div>
  );
};

export default App;
