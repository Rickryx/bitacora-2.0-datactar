
import React from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface SettingsViewProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (view: any) => void;
  onEndShift: () => void;
  activeShift?: any;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onLogout, onNavigate, onEndShift, activeShift }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const formatStartTime = (isoString?: string) => {
    if (!isoString) return '00:00 AM';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 p-4 pt-10 flex items-center justify-between">
        <button onClick={onBack} className="p-2 text-primary">
          <span className="material-symbols-outlined !text-3xl">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-12">Ajustes</h2>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h3 className="text-slate-900 text-lg font-bold mb-3 px-1">Perfil</h3>
          <div className="flex items-center gap-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="size-16 rounded-full border-2 border-primary/10 overflow-hidden">
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-slate-900 text-lg font-bold leading-tight">{user.name}</p>
              <p className="text-slate-500 text-sm font-medium mt-1">ID: {user.id} • {activeShift?.entities?.name || 'Bitácora'}</p>
              <p className="text-primary text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                En servicio • {formatStartTime(activeShift?.actual_start || activeShift?.scheduled_start)}
              </p>
            </div>
          </div>
        </section>

        {user.role === 'ADMIN' && (
          <section>
            <h3 className="text-slate-900 text-lg font-bold mb-3 px-1">Administración</h3>
            <button
              onClick={() => onNavigate('ADMIN')}
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-yellow-400">shield_person</span>
              <span>Panel de Control</span>
            </button>
          </section>
        )}

        <section>
          <h3 className="text-slate-900 text-lg font-bold mb-3 px-1">Acciones de Turno</h3>
          <button
            onClick={onEndShift}
            className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Finalizar Turno</span>
          </button>
        </section>

        <section>
          <h3 className="text-slate-900 text-lg font-bold mb-3 px-1">Configuración</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <span className="font-bold text-slate-700">Notificaciones</span>
              </div>
              <div className="w-11 h-6 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 size-4 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">cloud_off</span>
                </div>
                <span className="font-bold text-slate-700">Modo Offline</span>
              </div>
              <div className="w-11 h-6 bg-slate-200 rounded-full relative">
                <div className="absolute left-1 top-1 size-4 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-5 active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">help</span>
                </div>
                <span className="font-bold text-slate-700">Ayuda y Soporte</span>
              </div>
              <span className="material-symbols-outlined text-slate-300">chevron_right</span>
            </div>
          </div>
        </section>

        <section className="pt-6">
          <button
            onClick={handleLogout}
            className="w-full bg-white text-red-500 py-4 rounded-3xl font-black shadow-sm border border-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            Cerrar Sesión
          </button>
          <p className="text-center text-xs text-slate-400 mt-8 font-medium italic">Datactar v2.4.0 (2024)</p>
        </section>
      </main>
    </div>
  );
};

export default SettingsView;
