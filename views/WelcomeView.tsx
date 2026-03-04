
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface WelcomeViewProps {
  user: User;
  onStartTurn: () => void;
  stats: {
    visitors: number;
    rounds: number;
    incidents: number;
  };
  activeShift?: any;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ user, onStartTurn, stats, activeShift }) => {
  const [pendingShifts, setPendingShifts] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0);
    supabase
      .from('shifts')
      .select('*, entities(name)')
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .gte('scheduled_start', windowStart.toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (data) setPendingShifts(data);
      });
  }, [user?.id]);

  if (!user) return <div className="min-h-screen bg-white flex items-center justify-center">Cargando perfil...</div>;

  const formatShiftTime = (isoString: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatShiftDate = (isoString: string) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="pt-16 px-6 flex justify-between items-start">
        <div>
          <h1 className="text-primary text-4xl font-extrabold tracking-tight">Minuta</h1>
          <p className="text-slate-500 text-base font-medium">Datactar</p>
        </div>
        <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-primary/20 p-0.5 overflow-hidden">
          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-12 space-y-8">
        <div className="space-y-1">
          <h2 className="text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            ¡Hola, <br />{user.name.split(' ')[0]}!
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xl text-slate-500 font-medium">Bienvenido a tu turno</p>
            {activeShift && (
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                {formatShiftTime(activeShift.scheduled_start)} - {formatShiftTime(activeShift.scheduled_end)}
              </span>
            )}
          </div>
        </div>

        {/* Próximos turnos */}
        {pendingShifts.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Mis próximos turnos</p>
            <div className="space-y-2">
              {pendingShifts.map(shift => (
                <div key={shift.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined !text-xl">calendar_month</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{shift.entities?.name || 'Entidad'}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {formatShiftDate(shift.scheduled_start)} · {formatShiftTime(shift.scheduled_start)} – {formatShiftTime(shift.scheduled_end)}
                    </p>
                  </div>
                  {shift.expected_rounds != null && (
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-slate-900">{shift.expected_rounds}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">rondas</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ACTIVIDAD RECIENTE</p>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined">group</span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.visitors}</p>
                <p className="text-sm font-bold text-slate-400 tracking-tight">Visitantes registrados hoy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.rounds}</p>
                <p className="text-sm font-bold text-slate-400 tracking-tight">Rondas completadas hoy</p>
              </div>
            </div>
            {stats.incidents > 0 && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{stats.incidents}</p>
                  <p className="text-sm font-bold text-slate-400 tracking-tight">Incidentes reportados</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="p-8 pb-12 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 text-slate-500 font-medium">
            <span className="material-symbols-outlined text-2xl">schedule</span>
            <span className="text-lg tracking-tight">
              Horario: {activeShift ? `${formatShiftTime(activeShift.scheduled_start)} - ${formatShiftTime(activeShift.scheduled_end)}` : '--:--'}
            </span>
          </div>
        </div>

        <button
          onClick={onStartTurn}
          className="w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white py-5 rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined text-3xl">play_circle</span>
          <span className="text-xl font-bold tracking-wide">Empezar Turno</span>
        </button>
      </footer>
    </div>
  );
};

export default WelcomeView;
