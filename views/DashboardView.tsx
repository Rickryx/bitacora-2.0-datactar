
import React, { useEffect, useState } from 'react';
import { User, AppView, Shift } from '../types';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import ShiftValidationModal from '../components/ShiftValidationModal';

interface DashboardViewProps {
  user: User;
  onNavigate: (view: AppView) => void;
  onVoiceClick: () => void;
  pendingPackagesCount?: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onNavigate, onVoiceClick, pendingPackagesCount = 0 }) => {
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);

  useEffect(() => {
    checkActiveShift();
  }, [user.id]);

  const checkActiveShift = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shifts')
      .select('*, entities(name)')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (data) setActiveShift(data);
    else setActiveShift(null);
    setLoading(false);
  };

  const handleStartShift = async () => {
    // Look for a PENDING shift for today
    const { data: pendingShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .order('scheduled_start', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pendingShift) {
      const { error } = await supabase
        .from('shifts')
        .update({ status: 'ACTIVE', actual_start: new Date().toISOString() })
        .eq('id', pendingShift.id);

      if (error) alert(error.message);
      else checkActiveShift();
    } else {
      alert("No tienes turnos programados pendientes. Contacta al administrador.");
    }
  };

  const finishShift = async (reason?: string) => {
    const { error } = await supabase
      .from('shifts')
      .update({
        status: 'COMPLETED',
        actual_end: new Date().toISOString(),
        finish_reason: reason
      })
      .eq('id', activeShift.id);

    if (error) alert(error.message);
    else {
      setActiveShift(null);
      setShowValidationModal(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;

    if (!activeShift.scheduled_end) {
      if (confirm("¿Seguro que quieres finalizar tu turno?")) finishShift();
      return;
    }

    const scheduledEnd = new Date(activeShift.scheduled_end).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.abs(now - scheduledEnd) / (1000 * 60);

    if (diffMinutes > 30) {
      setShowValidationModal(true);
    } else {
      if (confirm("¿Seguro que quieres finalizar tu turno?")) finishShift();
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';
  const canAct = isAdmin || activeShift !== null;

  if (loading) {
    return (
      <Layout activeView={AppView.DASHBOARD} onNavigate={onNavigate} onVoiceClick={onVoiceClick}>
        <div className="h-screen flex items-center justify-center text-slate-400 font-bold">
          Verificando turno...
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeView={AppView.DASHBOARD} onNavigate={onNavigate} onVoiceClick={onVoiceClick}>
      <div className="pt-8 px-6 flex justify-between items-start mb-4">
        <div>
          <h1 className="text-primary text-2xl font-extrabold tracking-tight">MINU</h1>
          <p className="text-slate-500 text-sm font-medium -mt-1">Datactar</p>
        </div>
        <button
          onClick={() => onNavigate(AppView.SETTINGS)}
          className="p-2 text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined !text-3xl">settings</span>
        </button>
      </div>

      <header className="flex items-center p-6 pt-0 justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full border-2 border-primary overflow-hidden shadow-sm">
            <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500">{isAdmin ? 'Modo Administrador' : (activeShift ? activeShift.entities?.name : 'Sin turno activo')}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${canAct ? 'bg-primary/10' : 'bg-slate-100'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${canAct ? 'bg-primary animate-pulse' : 'bg-slate-300'}`}></span>
          <span className={`${canAct ? 'text-primary' : 'text-slate-400'} text-[10px] font-bold tracking-wide uppercase`}>
            {isAdmin ? 'Admin' : (activeShift ? 'En Turno' : 'Fuera')}
          </span>
        </div>
      </header>

      {isAdmin && (
        <div className="px-6 mb-4">
          <button
            onClick={() => onNavigate(AppView.ADMIN)}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-400">dashboard_customize</span>
              <div className="text-left">
                <p className="text-sm font-bold">Panel de Control Admin</p>
                <p className="text-[10px] opacity-60">Gestionar entidades, turnos e informes</p>
              </div>
            </div>
            <span className="material-symbols-outlined opacity-50">arrow_forward_ios</span>
          </button>
        </div>
      )}

      <main className="p-6 pt-2 space-y-8">
        {!canAct && !isAdmin ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center space-y-6 shadow-sm">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-primary text-4xl">timer</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Inicia tu jornada</h3>
              <p className="text-slate-400 text-sm">Debes iniciar turno para poder visualizar y registrar incidentes en el sistema.</p>
            </div>
            <button
              onClick={handleStartShift}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-soft active:scale-[0.98] transition-all"
            >
              Iniciar Turno
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {isAdmin ? 'Acciones Globales' : `Acciones en ${activeShift?.entities?.name}`}
                </h3>
                {!isAdmin && <button onClick={handleEndShift} className="text-[10px] font-black text-red-500 uppercase tracking-widest border border-red-100 px-3 py-1 rounded-full">Finalizar</button>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onNavigate(AppView.VISITOR_FORM)}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 items-start shadow-sm active:scale-95 transition-all group"
                >
                  <div className="text-primary bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-3xl">person</span>
                  </div>
                  <h4 className="text-slate-800 text-base font-bold">Visitante</h4>
                </button>
                <button
                  onClick={() => onNavigate(AppView.ROUND_FORM)}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 items-start shadow-sm active:scale-95 transition-all group"
                >
                  <div className="text-primary bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-3xl">verified_user</span>
                  </div>
                  <h4 className="text-slate-800 text-base font-bold">Ronda</h4>
                </button>
                <button
                  onClick={() => onNavigate(AppView.VISITOR_FORM)}
                  className="col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 shadow-sm active:scale-95 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-orange-600 bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                      <span className="material-symbols-outlined !text-2xl">local_shipping</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-slate-900 text-base font-bold">Domicilio</h4>
                      <p className="text-xs text-orange-600 font-bold">Rappi, Mensajería...</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-orange-400">chevron_right</span>
                </button>

                <button
                  onClick={() => onNavigate(AppView.ENCOMIENDAS_HUB)}
                  className="relative flex flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-5 items-start shadow-sm active:scale-95 transition-all group"
                >
                  {pendingPackagesCount > 0 && (
                    <span className="absolute top-3 right-3 bg-violet-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {pendingPackagesCount > 9 ? '9+' : pendingPackagesCount}
                    </span>
                  )}
                  <div className="text-violet-600 bg-white p-3 rounded-xl border border-violet-100 shadow-sm group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-3xl">inventory_2</span>
                  </div>
                  <h4 className="text-slate-800 text-base font-bold">Encomienda</h4>
                </button>

                <button
                  onClick={() => onNavigate(AppView.FACTURA_BATCH_FORM)}
                  className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-5 items-start shadow-sm active:scale-95 transition-all group"
                >
                  <div className="text-teal-600 bg-white p-3 rounded-xl border border-teal-100 shadow-sm group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-3xl">description</span>
                  </div>
                  <h4 className="text-slate-800 text-base font-bold">Factura</h4>
                </button>

                <button
                  onClick={() => onNavigate(AppView.INCIDENT_FORM)}
                  className="col-span-2 relative group overflow-hidden rounded-3xl border-2 border-red-500/20 bg-white p-6 shadow-sm flex flex-col items-center gap-4 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="text-red-600 bg-red-100 p-3.5 rounded-2xl">
                      <span className="material-symbols-outlined font-bold !text-4xl">warning</span>
                    </div>
                    <div className="text-left flex-1">
                      <h2 className="text-slate-900 text-xl font-extrabold leading-none">Registro de Incidente</h2>
                      <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wider">Acceso Dual Activado</p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-slate-100 my-1"></div>
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-slate-600 text-sm font-medium">
                      <span className="text-primary font-bold">Tocar</span> para registrar incidente
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
                      <p className="text-red-600 text-xs font-bold">Mantener oprimido para SOS</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-full text-center space-y-2">
                <h1 className="text-slate-900 text-xl font-bold px-4 leading-tight">
                  Presiona el micrófono para dictar...
                </h1>
                <p className="text-slate-400 text-base italic">
                  "Se observa puerta principal sin seguro..."
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {showValidationModal && (
        <ShiftValidationModal
          title="Finalización de Turno"
          message="Te encuentras fuera del rango de 30 minutos de tu hora de salida programada. Por favor indica el motivo."
          onConfirm={finishShift}
          onCancel={() => setShowValidationModal(false)}
        />
      )}
    </Layout>
  );
};

export default DashboardView;
