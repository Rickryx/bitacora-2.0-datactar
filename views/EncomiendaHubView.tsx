
import React, { useState } from 'react';
import { LogEntry, AppView, EventType } from '../types';
import Layout from '../components/Layout';
import PackagePickupModal from '../components/PackagePickupModal';

interface EncomiendaHubViewProps {
  logs: LogEntry[];
  onNavigate: (view: AppView) => void;
  onVoiceClick: () => void;
  onUpdateLog: (id: string, updates: any) => void;
}

const EncomiendaHubView: React.FC<EncomiendaHubViewProps> = ({ logs, onNavigate, onVoiceClick, onUpdateLog }) => {
  const [showClosed, setShowClosed] = useState(false);
  const [pickupModalLog, setPickupModalLog] = useState<LogEntry | null>(null);

  const encomiendas = logs.filter(l => l.type === EventType.ENCOMIENDA);
  const pending = encomiendas.filter(l => l.status === 'ABIERTO');
  const closed = encomiendas.filter(l => l.status === 'CERRADO');

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

  return (
    <Layout activeView={AppView.ENCOMIENDAS_HUB} onNavigate={onNavigate} onVoiceClick={onVoiceClick}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => onNavigate(AppView.DASHBOARD)}
            className="flex items-center text-slate-500"
          >
            <span className="material-symbols-outlined">arrow_back_ios</span>
            <span className="text-sm font-bold">Inicio</span>
          </button>
          <button
            onClick={() => onNavigate(AppView.PACKAGE_FORM)}
            className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-black active:scale-95 transition-all shadow-md shadow-violet-600/25"
          >
            <span className="material-symbols-outlined !text-base">add</span>
            Nueva
          </button>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Encomiendas</h1>
      </div>

      <main className="p-4 space-y-6 pb-28">
        {/* Pendientes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Pendientes por recoger
            </span>
            {pending.length > 0 && (
              <span className="bg-violet-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-violet-300 text-4xl mb-2 block">inventory_2</span>
              <p className="text-violet-400 text-sm font-bold">Sin encomiendas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(log => (
                <div
                  key={log.id}
                  className="bg-white border border-violet-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => setPickupModalLog(log)}
                >
                  <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center shrink-0">
                    {log.imageUrl ? (
                      <img src={log.imageUrl} alt="paquete" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span className="material-symbols-outlined text-violet-600 !text-2xl">inventory_2</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm">{log.title}</p>
                    <p className="text-xs text-slate-500 truncate">{log.subtitle}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{formatTime(log.timestamp)}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Pendiente
                    </span>
                    <span className="material-symbols-outlined text-violet-400 !text-lg">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Entregadas / Devueltas */}
        {closed.length > 0 && (
          <section>
            <button
              onClick={() => setShowClosed(prev => !prev)}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Entregadas / Devueltas
              </span>
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {closed.length}
                </span>
                <span className={`material-symbols-outlined text-slate-400 !text-lg transition-transform duration-200 ${showClosed ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>

            {showClosed && (
              <div className="space-y-2">
                {closed.map(log => (
                  <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 opacity-70">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-400 !text-xl">inventory_2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 truncate text-sm">{log.title}</p>
                      <p className="text-xs text-slate-400 truncate">{log.subtitle}</p>
                      {log.details?.pickup_name && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          Recogida por {log.details.pickup_name}
                        </p>
                      )}
                      {log.details?.returned && (
                        <p className="text-[10px] text-orange-500 font-bold mt-0.5">Devuelta al remitente</p>
                      )}
                    </div>
                    <span className={`material-symbols-outlined !text-xl ${log.details?.returned ? 'text-orange-400' : 'text-emerald-500'}`}>
                      {log.details?.returned ? 'undo' : 'verified'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {pickupModalLog && (
        <PackagePickupModal
          packageTitle={pickupModalLog.title}
          onConfirm={(pickupName, signatureUrl) => {
            onUpdateLog(pickupModalLog.id, {
              status: 'CERRADO',
              details: {
                ...pickupModalLog.details,
                pickup_name: pickupName,
                pickup_signature_url: signatureUrl,
              },
            });
            setPickupModalLog(null);
          }}
          onReturn={() => {
            onUpdateLog(pickupModalLog.id, {
              status: 'CERRADO',
              details: {
                ...pickupModalLog.details,
                returned: true,
              },
            });
            setPickupModalLog(null);
          }}
          onCancel={() => setPickupModalLog(null)}
        />
      )}
    </Layout>
  );
};

export default EncomiendaHubView;
