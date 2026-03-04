
import React, { useState, useEffect } from 'react';
import { EventType } from '../types';

interface RoundFormViewProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  onVoiceClick: () => void;
}

const RoundFormView: React.FC<RoundFormViewProps> = ({ onBack, onSubmit, onVoiceClick }) => {
  const [seconds, setSeconds] = useState(868); // 14:28
  const [checks, setChecks] = useState({
    p1: false,
    p2: false,
    p3: false,
    p4: false
  });

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    onSubmit({
      type: EventType.ROUND,
      title: 'Ronda en curso',
      subtitle: `Ronda completada satisfactoriamente`,
      description: `Duración total: ${formatTime(seconds)}. Todos los puntos verificados.`,
      details: { duration: seconds, checks }
    });
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="bg-white border-b border-slate-200 p-4 pt-12 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary !text-3xl">verified_user</span>
            <h1 className="text-xl font-extrabold text-slate-900">Ronda en curso</h1>
          </div>
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-primary text-[10px] font-bold flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              En vivo
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-6xl font-black tracking-tighter text-primary tabular-nums">
            {formatTime(seconds)}
          </span>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] mt-2">Tiempo transcurrido</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 gap-8 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Puntos de control</h3>
          <div className="space-y-4">
            {[
              { id: 'p1', label: 'Puertas cerradas' },
              { id: 'p2', label: 'Luces perimetrales' },
              { id: 'p3', label: 'Accesos despejados' },
              { id: 'p4', label: 'Sin personas sospechosas' }
            ].map(item => (
              <label key={item.id} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                <span className="text-lg font-bold text-slate-800">{item.label}</span>
                <input
                  className="w-7 h-7 rounded-full border-slate-200 text-primary focus:ring-primary focus:ring-offset-0"
                  type="checkbox"
                  checked={(checks as any)[item.id]}
                  onChange={e => setChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-auto">
          <button
            onClick={onVoiceClick}
            className="flex items-center justify-center gap-3 w-full py-5 px-6 rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary font-bold active:bg-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined !text-3xl">mic</span>
            <span className="text-lg">Observaciones por voz</span>
          </button>
          <p className="text-center text-xs text-slate-400 italic px-8 leading-relaxed">
            Presiona para dictar novedades encontradas durante el recorrido.
          </p>
        </div>
      </main>

      <footer className="p-8 pb-12 bg-white border-t border-slate-200">
        <button
          onClick={handleFinish}
          className="w-full bg-primary hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-primary/30 active:scale-95 transition-all"
        >
          Finalizar ronda
        </button>
      </footer>
    </div>
  );
};

export default RoundFormView;
