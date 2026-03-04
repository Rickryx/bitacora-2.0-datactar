import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { AppView, User } from '../types';
import WebhookManager from '../components/WebhookManager';
import NexusConfigPanel from '../components/NexusConfigPanel';
import AdminChat from '../components/AdminChat';
import WeeklyCalendar from '../components/WeeklyCalendar';
import { generateMinutaPDF, generateResumenPDF } from '../services/reportService';

interface AdminViewProps {
    user: User;
    onNavigate: (view: AppView) => void;
}

type AdminTab = 'control' | 'users' | 'entities' | 'shifts' | 'webhooks' | 'nexus' | 'reportes';

const AdminView: React.FC<AdminViewProps> = ({ user, onNavigate }) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [entities, setEntities] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ full_name: '', role: 'GUARD' });
    const [entityForm, setEntityForm] = useState({ name: '', address: '' });
    const [shiftForm, setShiftForm] = useState({ user_id: '', entity_id: '', scheduled_start: '', scheduled_end: '', expected_rounds: 3 });
    const [activeTab, setActiveTab] = useState<AdminTab>('control');
    const [detailId, setDetailId] = useState<string | null>(null);
    const [detailView, setDetailView] = useState<'entity' | 'user' | null>(null);

    // Metrics State
    const [metrics, setMetrics] = useState({
        todayVisitors: 0,
        activeIncidents: 0,
        guardsOnDuty: 0,
        criticalEvents: [] as any[]
    });

    const [filterRole, setFilterRole] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [shiftAlerts, setShiftAlerts] = useState<any[]>([]);

    // Chat sidebar
    const [chatOpen, setChatOpen] = useState(false);

    // Shifts sub-view
    const [shiftSubView, setShiftSubView] = useState<'list' | 'calendar'>('list');
    const [shiftFilter, setShiftFilter] = useState<string>('all');
    const [formCollapsed, setFormCollapsed] = useState(false);

    // Entity staff management
    const [assignUserId, setAssignUserId] = useState('');

    // Nexus entity selector
    const [nexusEntityId, setNexusEntityId] = useState('');

    // Report tab state
    const [reportPeriod, setReportPeriod] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('semana');
    const [reportLogs, setReportLogs] = useState<any[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [selectedEntityId, setSelectedEntityId] = useState('all');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'control') {
            await fetchMetrics();
            if (user.role === 'COORDINATOR') await fetchShiftAlerts();
        }
        else if (activeTab === 'users') await fetchProfiles();
        else if (activeTab === 'entities') await fetchEntities();
        else if (activeTab === 'shifts') await fetchShifts();
        else if (activeTab === 'nexus') { if (entities.length === 0) await fetchEntities(); }
        else if (activeTab === 'reportes') {
            if (entities.length === 0) await fetchEntities();
            await fetchReportData();
        }
        setLoading(false);
    };

    const fetchShiftAlerts = async () => {
        const today = new Date().toISOString().split('T')[0];

        const { data: activeShifts } = await supabase
            .from('shifts')
            .select('*, entities(name)')
            .eq('status', 'ACTIVE');

        if (!activeShifts) { setShiftAlerts([]); return; }

        // Resolve guard names from profiles
        const { data: profs } = await supabase.from('profiles').select('id, full_name');
        const profMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
        activeShifts.forEach(s => { s.profiles = profMap[s.user_id] || null; });

        const { data: roundLogs } = await supabase
            .from('logs')
            .select('entity_id')
            .eq('type', 'ROUND')
            .gte('created_at', today);

        const alerts = activeShifts.map(shift => {
            const rounds = (roundLogs || []).filter(l => l.entity_id === shift.entity_id).length;
            const expected = shift.expected_rounds ?? 3;
            const isLate = shift.scheduled_start && shift.actual_start
                ? (new Date(shift.actual_start).getTime() - new Date(shift.scheduled_start).getTime()) > 30 * 60 * 1000
                : false;
            return { ...shift, roundsDone: rounds, expectedRounds: expected, isLate };
        });

        setShiftAlerts(alerts);
    };

    const fetchMetrics = async () => {
        const today = new Date().toISOString().split('T')[0];

        // Fetch Today's Logs
        const { data: logs } = await supabase
            .from('logs')
            .select('*, entities(name)')
            .gte('created_at', today);

        // Fetch Guards on Duty
        const { count: guardsCount } = await supabase
            .from('shifts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');

        if (logs) {
            setMetrics({
                todayVisitors: logs.filter(l => l.type === 'VISITOR' || l.type === 'DELIVERY').length,
                activeIncidents: logs.filter(l => l.type === 'INCIDENT' && l.status === 'ABIERTO').length,
                guardsOnDuty: guardsCount || 0,
                criticalEvents: logs.filter(l => l.critical_level === 'ALTA' || l.type === 'INCIDENT').slice(0, 5)
            });
        }
    };

    const fetchProfiles = async () => {
        const { data, error } = await supabase.from('profiles').select('*').order('full_name');
        if (data) setProfiles(data);
        if (error) console.error(error);
    };

    const fetchEntities = async () => {
        // Fetch entities and profiles separately — avoids FK join that may not exist in schema
        const { data: ents, error } = await supabase.from('entities').select('*').order('name');
        if (error) { console.error('fetchEntities:', error.message); return; }

        const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, role, avatar_url, entity_id');
        if (profs) setProfiles(profs);

        const enriched = (ents || []).map(e => ({
            ...e,
            profiles: (profs || []).filter(p => p.entity_id === e.id),
        }));
        setEntities(enriched);
    };

    const fetchShifts = async () => {
        // Fetch shifts without profiles FK join (user_id → auth.users, not public.profiles)
        const { data: shiftsRaw, error } = await supabase
            .from('shifts')
            .select('*, entities(name)')
            .order('created_at', { ascending: false });
        if (error) { console.error('fetchShifts:', error.message); return; }

        // Ensure profiles are loaded for name resolution
        let profs = profiles;
        if (profs.length === 0) {
            const { data: p } = await supabase.from('profiles').select('id, full_name, role, avatar_url, entity_id');
            if (p) { setProfiles(p); profs = p; }
        }
        if (entities.length === 0) await fetchEntities();

        const enriched = (shiftsRaw || []).map(s => ({
            ...s,
            profiles: profs.find(p => p.id === s.user_id) || null,
        }));
        setShifts(enriched);
    };

    const fetchReportData = async (period = reportPeriod, entityId = selectedEntityId, from = customFrom, to = customTo) => {
        setReportLoading(true);
        const now = new Date();
        let dateFrom: string;
        let dateTo = now.toISOString();

        if (period === 'hoy') {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (period === 'semana') {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            dateFrom = d.toISOString();
        } else if (period === 'mes') {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 1);
            dateFrom = d.toISOString();
        } else {
            dateFrom = from ? new Date(from).toISOString() : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            dateTo = to ? new Date(to + 'T23:59:59').toISOString() : dateTo;
        }

        let query = supabase
            .from('logs')
            .select('*, entities(name)')
            .gte('created_at', dateFrom)
            .lte('created_at', dateTo)
            .order('created_at', { ascending: true });

        const effectiveEntityId = user.role === 'COORDINATOR' && user.entity_id ? user.entity_id : entityId;
        if (effectiveEntityId && effectiveEntityId !== 'all') {
            query = query.eq('entity_id', effectiveEntityId);
        }

        const { data: logsRaw } = await query;

        // Enrich logs with profile data manually
        if (logsRaw) {
            const { data: profs } = await supabase.from('profiles').select('id, full_name');
            const profMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
            setReportLogs(logsRaw.map(l => ({ ...l, profiles: profMap[l.user_id] || null })));
        }
        setReportLoading(false);
    };

    const handleSaveEntity = async () => {
        if (editingEntityId) {
            const { error } = await supabase.from('entities').update(entityForm).eq('id', editingEntityId);
            if (error) alert(error.message);
            else {
                setEntityForm({ name: '', address: '' });
                setEditingEntityId(null);
                fetchEntities();
            }
        } else {
            const { error } = await supabase.from('entities').insert([entityForm]);
            if (error) alert(error.message);
            else {
                setEntityForm({ name: '', address: '' });
                fetchEntities();
            }
        }
    };

    const handleEditEntity = (entity: any) => {
        setEditingEntityId(entity.id);
        setEntityForm({ name: entity.name, address: entity.address });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveShift = async () => {
        const toISO = (dt: string) => dt ? new Date(dt).toISOString() : null;
        const payload = {
            ...shiftForm,
            scheduled_start: toISO(shiftForm.scheduled_start),
            scheduled_end: toISO(shiftForm.scheduled_end),
        };
        const { error } = await supabase.from('shifts').insert([payload]);
        if (error) alert(error.message);
        else {
            setShiftForm({ user_id: '', entity_id: '', scheduled_start: '', scheduled_end: '', expected_rounds: 3 });
            fetchShifts();
        }
    };

    const handleEdit = (profile: any) => {
        setEditingId(profile.id);
        setEditForm({
            full_name: profile.full_name || '',
            role: profile.role || 'GUARD'
        });
    };

    const handleSave = async (id: string) => {
        const { error } = await supabase.from('profiles').update({
            full_name: editForm.full_name,
            role: editForm.role
        }).eq('id', id);

        if (error) {
            alert("Error al actualizar: " + error.message);
        } else {
            setEditingId(null);
            fetchProfiles();
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este perfil? Esto no elimina la cuenta de autenticación, solo el perfil de la bitácora.")) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else fetchProfiles();
    };

    const handleRemoveStaff = async (userId: string) => {
        const { error } = await supabase.from('profiles').update({ entity_id: null }).eq('id', userId);
        if (error) alert(error.message);
        else fetchEntities();
    };

    const handleAssignStaff = async (entityId: string) => {
        if (!assignUserId) return;
        const { error } = await supabase.from('profiles').update({ entity_id: entityId }).eq('id', assignUserId);
        if (error) alert(error.message);
        else { setAssignUserId(''); fetchEntities(); fetchProfiles(); }
    };

    const handleCompleteShift = async (shiftId: string) => {
        const { error } = await supabase.from('shifts').update({ status: 'COMPLETED', actual_end: new Date().toISOString() }).eq('id', shiftId);
        if (error) alert(error.message);
        else fetchShifts();
    };

    const handleCancelShift = async (shiftId: string) => {
        if (!confirm('¿Cancelar este turno?')) return;
        const { error } = await supabase.from('shifts').update({ status: 'CANCELLED' }).eq('id', shiftId);
        if (error) alert(error.message);
        else fetchShifts();
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Main content column */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 pt-8 pb-5 shrink-0">
                <div className="flex items-center gap-4 mb-5">
                    {detailView && (
                        <button onClick={() => { setDetailView(null); setDetailId(null); }} className="text-slate-900 flex items-center">
                            <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
                        </button>
                    )}
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        {detailView === 'entity' ? 'Detalle de Entidad' : detailView === 'user' ? 'Perfil de Usuario' : 'Administración'}
                    </h1>
                </div>

                {!detailView && (() => {
                    const isCoordinator = user.role === 'COORDINATOR';
                    const tabs: { id: AdminTab; label: string }[] = isCoordinator
                        ? [
                            { id: 'control', label: 'Panel Control' },
                            { id: 'shifts', label: 'Turnos' },
                            { id: 'reportes', label: 'Reportes' },
                          ]
                        : [
                            { id: 'control', label: 'Panel Control' },
                            { id: 'users', label: 'Usuarios' },
                            { id: 'entities', label: 'Entidades' },
                            { id: 'shifts', label: 'Turnos' },
                            { id: 'webhooks', label: 'Integraciones' },
                            { id: 'nexus', label: 'Nexus' },
                            { id: 'reportes', label: 'Reportes' },
                          ];
                    return (
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {tabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-soft' : 'bg-slate-50 text-slate-400'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    );
                })()}
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-8">
                {detailView === 'entity' && detailId && (
                    <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="size-16 rounded-2xl bg-primary text-white flex items-center justify-center">
                                    <span className="material-symbols-outlined !text-4xl">corporate_fare</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{entities.find(e => e.id === detailId)?.name}</h2>
                                    <p className="text-slate-500 font-medium">{entities.find(e => e.id === detailId)?.address}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Personal Asignado</h3>
                            <div className="space-y-3">
                                {(() => {
                                    const entity = entities.find(e => e.id === detailId);
                                    const staff: any[] = entity?.profiles || [];
                                    const unassigned = profiles.filter(p => !p.entity_id);
                                    return (
                                        <>
                                            {staff.length === 0 && (
                                                <p className="text-center py-6 text-slate-400 font-medium text-sm">Sin personal asignado a esta entidad.</p>
                                            )}
                                            {staff.map((person: any) => (
                                                <div key={person.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center text-slate-300">
                                                            {person.avatar_url ? <img src={person.avatar_url} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined">person</span>}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">{person.full_name}</p>
                                                            <span className={`text-[10px] font-black uppercase ${person.role === 'ADMIN' ? 'text-purple-500' : person.role === 'COORDINATOR' ? 'text-teal-500' : 'text-blue-500'}`}>{person.role}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveStaff(person.id)}
                                                        className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            ))}
                                            {unassigned.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    <select
                                                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/10"
                                                        value={assignUserId}
                                                        onChange={e => setAssignUserId(e.target.value)}
                                                    >
                                                        <option value="">Agregar personal...</option>
                                                        {unassigned.map(p => (
                                                            <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleAssignStaff(detailId!)}
                                                        disabled={!assignUserId}
                                                        className="px-5 py-2.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-soft disabled:opacity-40 active:scale-95 transition-all"
                                                    >
                                                        Agregar
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {detailView === 'user' && detailId && (
                    <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="size-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                    {profiles.find(p => p.id === detailId)?.avatar_url ? (
                                        <img src={profiles.find(p => p.id === detailId).avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-300 !text-4xl">person</span>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{profiles.find(p => p.id === detailId)?.full_name}</h2>
                                    <p className="text-primary font-bold text-sm uppercase tracking-wider">{profiles.find(p => p.id === detailId)?.role}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Turnos Cumplidos</p>
                                <p className="text-2xl font-black text-slate-900">{shifts.filter(s => s.user_id === detailId && s.status === 'COMPLETED').length}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Seguimiento de Novedades</h3>
                            <div className="space-y-3">
                                {shifts.filter(s => s.user_id === detailId).slice(0, 5).map(shift => (
                                    <div key={shift.id} className="bg-white p-5 rounded-3xl border border-slate-50 flex flex-col gap-2 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-900">{shift.entities?.name}</span>
                                            <span className="text-[10px] text-slate-400 font-black uppercase">{new Date(shift.scheduled_start).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${shift.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>{shift.status}</span>
                                            {shift.actual_start && (
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    Inició {new Date(shift.actual_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        {shift.finish_reason && (
                                            <div className="mt-2 p-3 bg-red-50/50 rounded-2xl border border-red-100/50">
                                                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Novedad registrada:</p>
                                                <p className="text-xs text-red-500 font-bold mt-1 leading-relaxed">"{shift.finish_reason}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!detailView && (
                    <>
                        {activeTab === 'control' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Metric Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
                                        <div className="size-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined">group</span>
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900">{metrics.todayVisitors}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visitantes Hoy</p>
                                    </div>
                                    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
                                        <div className="size-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined">warning</span>
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900">{metrics.activeIncidents}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incidentes Abiertos</p>
                                    </div>
                                    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
                                        <div className="size-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined">verified_user</span>
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900">{metrics.guardsOnDuty}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardias de Turno</p>
                                    </div>
                                    <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
                                        <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined">picture_as_pdf</span>
                                        </div>
                                        <button
                                            onClick={() => window.print()}
                                            className="text-xs font-black uppercase tracking-widest hover:text-blue-400 transition-colors"
                                        >
                                            Generar Reporte
                                        </button>
                                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">PDF Resumen Semanal</p>
                                    </div>
                                </div>

                                {/* Critical Events Feed */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Eventos Críticos</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[8px] font-bold animate-pulse">EN VIVO</span>
                                    </div>
                                    <div className="space-y-3">
                                        {metrics.criticalEvents.length === 0 ? (
                                            <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-3xl text-center">
                                                <p className="text-xs text-slate-400 font-bold uppercase">Sin eventos críticos recientes</p>
                                            </div>
                                        ) : (
                                            metrics.criticalEvents.map(event => (
                                                <div key={event.id} className="bg-white border-l-4 border-red-500 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-[10px] font-black text-red-600 uppercase">{event.entities?.name || 'General'}</span>
                                                            <span className="text-[10px] text-slate-400">{new Date(event.created_at).toLocaleTimeString()}</span>
                                                        </div>
                                                        <h5 className="text-sm font-bold text-slate-900 leading-tight">{event.title}</h5>
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{event.description}</p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                {/* Panel de alertas — solo COORDINATOR */}
                                {user.role === 'COORDINATOR' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Guardias en turno</h3>
                                            <button
                                                onClick={fetchShiftAlerts}
                                                className="text-[10px] font-black text-primary uppercase tracking-widest"
                                            >
                                                Actualizar
                                            </button>
                                        </div>
                                        {shiftAlerts.length === 0 ? (
                                            <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-3xl text-center">
                                                <p className="text-xs text-slate-400 font-bold uppercase">Sin guardias activos ahora</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {shiftAlerts.map(alert => {
                                                    const roundsOk = alert.roundsDone >= alert.expectedRounds;
                                                    const hasAlert = alert.isLate || !roundsOk;
                                                    return (
                                                        <div key={alert.id} className={`bg-white p-4 rounded-2xl border ${hasAlert ? 'border-amber-200' : 'border-slate-100'} shadow-sm`}>
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-900 truncate">
                                                                        {alert.profiles?.full_name || 'Guardia'}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 font-medium">{alert.entities?.name}</p>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${roundsOk ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                        <span className="material-symbols-outlined !text-xs">verified_user</span>
                                                                        <span className="text-[10px] font-black">{alert.roundsDone}/{alert.expectedRounds}</span>
                                                                    </div>
                                                                    {alert.isLate && (
                                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                                                            <span className="material-symbols-outlined !text-xs">schedule</span>
                                                                            <span className="text-[10px] font-black">Tarde</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* Filters Bar */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap gap-2 items-center">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">filter_list</span>
                                    <select
                                        className="bg-white border-none rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm"
                                        value={filterRole}
                                        onChange={(e) => setFilterRole(e.target.value)}
                                    >
                                        <option value="">Todos los Roles</option>
                                        <option value="GUARD">Guardias</option>
                                        <option value="ADMIN">Administradores</option>
                                        <option value="COORDINATOR">Coordinadores</option>
                                    </select>
                                    <select
                                        className="bg-white border-none rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="name">Ordenar: Nombre</option>
                                        <option value="role">Ordenar: Rol</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {loading ? (
                                        <div className="col-span-full text-center py-8 text-slate-400 font-medium">Cargando perfiles...</div>
                                    ) : (
                                        profiles
                                            .filter(p => !filterRole || p.role === filterRole)
                                            .sort((a, b) => {
                                                if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
                                                if (sortBy === 'role') return (a.role || '').localeCompare(b.role || '');
                                                return 0;
                                            })
                                            .map(profile => (
                                                <div key={profile.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-primary/20">
                                                    {editingId === profile.id ? (
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nombre Completo</label>
                                                                <input
                                                                    className="w-full border-b border-slate-200 py-2 font-bold focus:outline-none focus:border-primary bg-transparent text-sm"
                                                                    value={editForm.full_name}
                                                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rol de Acceso</label>
                                                                <select
                                                                    className="w-full border-b border-slate-200 py-2 font-bold bg-transparent text-sm"
                                                                    value={editForm.role}
                                                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                                >
                                                                    <option value="GUARD">Guardia</option>
                                                                    <option value="COORDINATOR">Coordinador</option>
                                                                    <option value="ADMIN">Administrador</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex gap-2 justify-end pt-2">
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="px-4 py-2 text-slate-400 font-bold text-sm"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSave(profile.id)}
                                                                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-soft"
                                                                >
                                                                    Guardar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setDetailId(profile.id); setDetailView('user'); }}>
                                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                                                                    {profile.avatar_url ? (
                                                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="material-symbols-outlined text-slate-300 text-2xl">person</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-slate-900 leading-tight">{profile.full_name || 'Sin Nombre'}</h3>
                                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${profile.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' : profile.role === 'COORDINATOR' ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                        {profile.role || 'GUARD'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleEdit(profile)}
                                                                    className="w-9 h-9 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteUser(profile.id)}
                                                                    className="w-9 h-9 flex items-center justify-center bg-slate-50 rounded-xl text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'entities' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {editingEntityId ? 'Editar Entidad' : 'Nueva Entidad'}
                                        </h3>
                                        {editingEntityId && (
                                            <button
                                                onClick={() => { setEditingEntityId(null); setEntityForm({ name: '', address: '' }); }}
                                                className="text-[10px] font-black text-primary uppercase"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            placeholder="Nombre (ej. Conjunto Residencial)"
                                            className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                            value={entityForm.name}
                                            onChange={e => setEntityForm({ ...entityForm, name: e.target.value })}
                                        />
                                        <input
                                            placeholder="Dirección"
                                            className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                            value={entityForm.address}
                                            onChange={e => setEntityForm({ ...entityForm, address: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveEntity}
                                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                    >
                                        {editingEntityId ? 'Actualizar Entidad' : 'Registrar Entidad'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {entities.map(entity => (
                                        <div key={entity.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                                        <span className="material-symbols-outlined !text-3xl">corporate_fare</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-lg leading-tight mb-1">{entity.name}</h4>
                                                        <p className="text-xs text-slate-400 font-medium">{entity.address}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setDetailId(entity.id); setDetailView('entity'); }}
                                                        className="size-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined !text-xl">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditEntity(entity)}
                                                        className="size-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined !text-xl">edit</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Estado</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                        <span className="text-xs font-bold text-slate-600">Activo</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex -space-x-2">
                                                        {(entity.profiles || []).slice(0, 3).map((p: any) => (
                                                            <div key={p.id} className="size-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden">
                                                                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined !text-[10px] text-slate-300">person</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">{(entity.profiles || []).length} personal</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'shifts' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* Collapsable shift form */}
                                <div className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden">
                                    <button
                                        onClick={() => setFormCollapsed(f => !f)}
                                        className="w-full flex items-center justify-between px-6 py-4 text-left"
                                    >
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Programar Turno</span>
                                        <span className="material-symbols-outlined text-slate-400 transition-transform" style={{ transform: formCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                                            expand_more
                                        </span>
                                    </button>
                                    {!formCollapsed && (
                                        <div className="px-6 pb-6 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Guardia Responsable</label>
                                                    <select
                                                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                                        value={shiftForm.user_id}
                                                        onChange={e => setShiftForm({ ...shiftForm, user_id: e.target.value })}
                                                    >
                                                        <option value="">Seleccionar Guardia</option>
                                                        {profiles.filter(p => p.role === 'GUARD').map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ubicación / Entidad</label>
                                                    <select
                                                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                                        value={shiftForm.entity_id}
                                                        onChange={e => setShiftForm({ ...shiftForm, entity_id: e.target.value })}
                                                    >
                                                        <option value="">Seleccionar Entidad</option>
                                                        {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inicio de Turno</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                                        value={shiftForm.scheduled_start}
                                                        onChange={e => setShiftForm({ ...shiftForm, scheduled_start: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fin de Turno</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                                        value={shiftForm.scheduled_end}
                                                        onChange={e => setShiftForm({ ...shiftForm, scheduled_end: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rondas esperadas</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="20"
                                                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                                                        value={shiftForm.expected_rounds}
                                                        onChange={e => setShiftForm({ ...shiftForm, expected_rounds: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleSaveShift}
                                                className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                            >
                                                Programar Turno
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Sub-tabs */}
                                <div className="flex gap-2">
                                    {(['list', 'calendar'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setShiftSubView(v)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${shiftSubView === v ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {v === 'list' ? 'Lista' : 'Calendario'}
                                        </button>
                                    ))}
                                </div>

                                {/* Sub-vista Lista */}
                                {shiftSubView === 'list' && (
                                    <div className="space-y-4">
                                        {/* Filter pills */}
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                            {[
                                                { value: 'all', label: 'Todos' },
                                                { value: 'PENDING', label: 'Pendientes' },
                                                { value: 'ACTIVE', label: 'Activos' },
                                                { value: 'COMPLETED', label: 'Completados' },
                                                { value: 'CANCELLED', label: 'Cancelados' },
                                            ].map(f => (
                                                <button
                                                    key={f.value}
                                                    onClick={() => setShiftFilter(f.value)}
                                                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${shiftFilter === f.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Shift cards */}
                                        <div className="space-y-3">
                                            {shifts
                                                .filter(s => shiftFilter === 'all' || s.status === shiftFilter)
                                                .map(shift => {
                                                    const guardName = shift.profiles?.full_name || 'Guardia';
                                                    const entityName = shift.entities?.name || 'Entidad';
                                                    const statusColors: Record<string, string> = {
                                                        ACTIVE: 'bg-green-50 text-green-600',
                                                        PENDING: 'bg-amber-50 text-amber-600',
                                                        COMPLETED: 'bg-slate-100 text-slate-500',
                                                        CANCELLED: 'bg-red-50 text-red-400',
                                                    };
                                                    const statusColor = statusColors[shift.status] || 'bg-slate-100 text-slate-400';
                                                    const startTime = shift.scheduled_start ? new Date(shift.scheduled_start).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '--';
                                                    const endTime = shift.scheduled_end ? new Date(shift.scheduled_end).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '--';
                                                    return (
                                                        <div key={shift.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div className="size-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                                        <span className="material-symbols-outlined text-slate-300">person</span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-slate-900 text-sm truncate">{guardName}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                                                <span className="material-symbols-outlined !text-xs">location_on</span>
                                                                                {entityName}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                                                <span className="material-symbols-outlined !text-xs">schedule</span>
                                                                                {startTime}–{endTime}
                                                                            </span>
                                                                        </div>
                                                                        {shift.expected_rounds > 0 && (
                                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                                                <span className="material-symbols-outlined !text-xs">refresh</span>
                                                                                Rondas: {shift.expected_rounds}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${statusColor}`}>
                                                                    {shift.status}
                                                                </span>
                                                            </div>
                                                            {(shift.status === 'ACTIVE' || shift.status === 'PENDING') && (
                                                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                                                                    {shift.status === 'ACTIVE' && (
                                                                        <button
                                                                            onClick={() => handleCompleteShift(shift.id)}
                                                                            className="flex-1 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors"
                                                                        >
                                                                            Completar
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleCancelShift(shift.id)}
                                                                        className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            {shifts.filter(s => shiftFilter === 'all' || s.status === shiftFilter).length === 0 && (
                                                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-3xl text-center">
                                                    <p className="text-xs text-slate-400 font-bold uppercase">Sin turnos en este estado</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Sub-vista Calendario */}
                                {shiftSubView === 'calendar' && (
                                    <WeeklyCalendar
                                        shifts={shifts}
                                        profiles={profiles}
                                        onEditShift={(s) => {
                                            setShiftForm({
                                                user_id: s.user_id,
                                                entity_id: s.entity_id,
                                                scheduled_start: s.scheduled_start.split('.')[0],
                                                scheduled_end: s.scheduled_end.split('.')[0],
                                                expected_rounds: s.expected_rounds ?? 3
                                            });
                                            setFormCollapsed(false);
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'reportes' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* Period selector + entity filter */}
                                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período del Reporte</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {(['hoy', 'semana', 'mes', 'custom'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => {
                                                    setReportPeriod(p);
                                                    if (p !== 'custom') fetchReportData(p, selectedEntityId, customFrom, customTo);
                                                }}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${reportPeriod === p ? 'bg-primary text-white shadow-soft' : 'bg-slate-50 text-slate-400'}`}
                                            >
                                                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Personalizado'}
                                            </button>
                                        ))}
                                    </div>
                                    {reportPeriod === 'custom' && (
                                        <div className="flex gap-4 flex-wrap">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                                                <input
                                                    type="date"
                                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/10"
                                                    value={customFrom}
                                                    onChange={e => setCustomFrom(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                                                <input
                                                    type="date"
                                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/10"
                                                    value={customTo}
                                                    onChange={e => setCustomTo(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    onClick={() => fetchReportData('custom', selectedEntityId, customFrom, customTo)}
                                                    className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-soft"
                                                >
                                                    Buscar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {user.role !== 'COORDINATOR' && entities.length > 0 && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidad</label>
                                            <select
                                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/10"
                                                value={selectedEntityId}
                                                onChange={e => {
                                                    setSelectedEntityId(e.target.value);
                                                    fetchReportData(reportPeriod, e.target.value, customFrom, customTo);
                                                }}
                                            >
                                                <option value="all">Todas las entidades</option>
                                                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Metrics cards */}
                                {reportLoading ? (
                                    <div className="text-center py-10 text-slate-400 font-medium">Cargando datos...</div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Visitantes', count: reportLogs.filter(l => l.type === 'VISITOR').length, icon: 'group', color: 'bg-blue-50 text-blue-600' },
                                                { label: 'Rondas', count: reportLogs.filter(l => l.type === 'ROUND').length, icon: 'directions_walk', color: 'bg-green-50 text-green-600' },
                                                { label: 'Incidentes', count: reportLogs.filter(l => l.type === 'INCIDENT').length, icon: 'warning', color: 'bg-red-50 text-red-600' },
                                                { label: 'Encomiendas', count: reportLogs.filter(l => l.type === 'DELIVERY' || l.type === 'ENCOMIENDA').length, icon: 'inventory_2', color: 'bg-amber-50 text-amber-600' },
                                            ].map(card => (
                                                <div key={card.label} className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
                                                    <div className={`size-10 rounded-2xl ${card.color} flex items-center justify-center mb-3`}>
                                                        <span className="material-symbols-outlined">{card.icon}</span>
                                                    </div>
                                                    <h4 className="text-2xl font-black text-slate-900">{card.count}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Download buttons */}
                                        <div className="flex gap-4 flex-wrap">
                                            <button
                                                onClick={() => {
                                                    const entityName = selectedEntityId === 'all'
                                                        ? 'Todas las Entidades'
                                                        : (entities.find(e => e.id === selectedEntityId)?.name || 'Entidad');
                                                    generateMinutaPDF(reportLogs, {
                                                        entityName,
                                                        dateFrom: customFrom || new Date(Date.now() - 7 * 86400000).toLocaleDateString('es-CO'),
                                                        dateTo: customTo || new Date().toLocaleDateString('es-CO'),
                                                        generatedBy: user.name || 'Administrador',
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all"
                                            >
                                                <span className="material-symbols-outlined !text-lg">description</span>
                                                Descargar Minuta PDF
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const entityName = selectedEntityId === 'all'
                                                        ? 'Todas las Entidades'
                                                        : (entities.find(e => e.id === selectedEntityId)?.name || 'Entidad');
                                                    generateResumenPDF(reportLogs, shifts, {
                                                        entityName,
                                                        dateFrom: customFrom || new Date(Date.now() - 7 * 86400000).toLocaleDateString('es-CO'),
                                                        dateTo: customTo || new Date().toLocaleDateString('es-CO'),
                                                        generatedBy: user.name || 'Administrador',
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                            >
                                                <span className="material-symbols-outlined !text-lg">bar_chart</span>
                                                Descargar Resumen PDF
                                            </button>
                                        </div>

                                        {/* Preview table */}
                                        {reportLogs.length > 0 && (
                                            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                                                <div className="px-6 py-4 border-b border-slate-50">
                                                    <h3 className="text-sm font-black text-slate-900">Vista previa — {reportLogs.length} eventos</h3>
                                                </div>
                                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                                    <table className="w-full text-sm">
                                                        <thead className="sticky top-0 bg-slate-50">
                                                            <tr>
                                                                <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</th>
                                                                <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                                                <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento</th>
                                                                <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                                                <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {reportLogs.slice(0, 10).map(log => (
                                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-5 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                                        {new Date(log.occurred_at || log.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                                    </td>
                                                                    <td className="px-5 py-3">
                                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase">{log.type}</span>
                                                                    </td>
                                                                    <td className="px-5 py-3 font-bold text-slate-900 text-xs max-w-[200px] truncate">{log.title}</td>
                                                                    <td className="px-5 py-3 text-[10px] font-bold text-slate-500">{log.status}</td>
                                                                    <td className="px-5 py-3">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${log.critical_level === 'ALTA' ? 'bg-red-100 text-red-600' : log.critical_level === 'MEDIA' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                            {log.critical_level || 'BAJA'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {reportLogs.length > 10 && (
                                                        <p className="text-center py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50">
                                                            +{reportLogs.length - 10} más en el PDF
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {reportLogs.length === 0 && (
                                            <div className="bg-slate-50 border border-dashed border-slate-200 p-10 rounded-3xl text-center">
                                                <p className="text-xs text-slate-400 font-bold uppercase">Sin eventos en el período seleccionado</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'webhooks' && <WebhookManager />}

                        {activeTab === 'nexus' && (
                            <div className="space-y-5 animate-in fade-in duration-500">
                                {/* Explanation banner */}
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                                    <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
                                    <div className="text-xs text-blue-700 space-y-1">
                                        <p className="font-black uppercase tracking-widest text-[10px]">¿Qué es Nexus?</p>
                                        <p className="font-medium leading-relaxed">Nexus sincroniza los eventos de Bitácora con el sistema centralizado de Datactar. Necesitas el <strong>endpoint</strong> y el <strong>API key</strong> que te entregó tu fuente Nexus. Cada entidad tiene su propia configuración.</p>
                                    </div>
                                </div>

                                {entities.length === 0 ? (
                                    <div className="bg-slate-50 border border-dashed border-slate-200 p-10 rounded-3xl text-center space-y-3">
                                        <span className="material-symbols-outlined text-slate-300 !text-4xl">corporate_fare</span>
                                        <p className="text-sm font-bold text-slate-400">Primero crea una entidad en la pestaña <strong>Entidades</strong> para configurar Nexus.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Entity selector */}
                                        {entities.length > 1 && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configurar para entidad</label>
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10"
                                                    value={nexusEntityId || entities[0].id}
                                                    onChange={e => setNexusEntityId(e.target.value)}
                                                >
                                                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <NexusConfigPanel entityId={nexusEntityId || entities[0].id} />
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
            </div>{/* end main content column */}

            {/* Chat sidebar */}
            <div className={`border-l border-slate-100 bg-white flex flex-col transition-all duration-300 overflow-hidden shrink-0 ${chatOpen ? 'w-80' : 'w-12'}`}>
                {chatOpen
                    ? <AdminChat asSidebar={true} onCollapse={() => setChatOpen(false)} />
                    : <button
                        onClick={() => setChatOpen(true)}
                        className="mt-6 flex flex-col items-center gap-1 w-full text-slate-400 hover:text-primary transition-colors py-2"
                        title="Abrir asistente AI"
                      >
                        <span className="material-symbols-outlined">forum</span>
                      </button>
                }
            </div>
        </div>
    );
};

export default AdminView;
