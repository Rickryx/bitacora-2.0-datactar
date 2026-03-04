
import React, { useState } from 'react';
import { LogEntry, AppView, EventType } from '../types';
import Layout from '../components/Layout';
import PackagePickupModal from '../components/PackagePickupModal';

interface MinutaViewProps {
  logs: LogEntry[];
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onVoiceClick: () => void;
  onUpdateLog?: (id: string, updates: Partial<LogEntry>) => void;
}

type MinutaFilter = 'todo' | 'facturas';

const MinutaView: React.FC<MinutaViewProps> = ({ logs, onNavigate, onVoiceClick, onUpdateLog }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickupModalLog, setPickupModalLog] = useState<LogEntry | null>(null);
  const [filter, setFilter] = useState<MinutaFilter>('todo');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getTypeStyles = (type: EventType) => {
    switch (type) {
      case EventType.VISITOR:
        return { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'person', label: 'Visitante' };
      case EventType.DELIVERY:
        return { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'local_shipping', label: 'Domicilio' };
      case EventType.INCIDENT:
        return { bg: 'bg-red-50', text: 'text-red-600', icon: 'warning', label: 'Incidente' };
      case EventType.ROUND:
        return { bg: 'bg-green-50', text: 'text-green-600', icon: 'verified_user', label: 'Ronda' };
      case EventType.SERVICE:
        return { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'engineering', label: 'Servicio' };
      case EventType.PROVEEDOR:
        return { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'store', label: 'Proveedor' };
      case EventType.INFO:
        return { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'help', label: 'Nota/Info' };
      case EventType.FACTURA:
        return { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'description', label: 'Factura' };
      case EventType.ENCOMIENDA:
        return { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'inventory_2', label: 'Encomienda' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'info', label: 'Evento' };
    }
  };

  return (
    <Layout activeView={AppView.MINUTA} onNavigate={onNavigate} onVoiceClick={onVoiceClick}>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => onNavigate(AppView.DASHBOARD)} className="flex items-center text-slate-500">
            <span className="material-symbols-outlined">arrow_back_ios</span>
            <span className="text-sm font-bold">Volver</span>
          </button>
          <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Hoy
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bitácora</h1>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setFilter('todo')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${filter === 'todo' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            Todo
          </button>
          <button
            onClick={() => setFilter('facturas')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${filter === 'facturas' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'}`}
          >
            Facturas
          </button>
        </div>
      </header>

      <main className="p-4 space-y-3 pb-24">
        {logs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
            <p>No hay registros aún.</p>
          </div>
        )}

        {[...logs]
          .filter(log => filter === 'todo' || (filter === 'facturas' && log.type === EventType.FACTURA))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map(log => {
          const styles = getTypeStyles(log.type);
          const isExpanded = expandedId === log.id;

          return (
            <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
              {/* Header Row - Always Visible */}
              <div
                onClick={() => toggleExpand(log.id)}
                className="flex items-center p-4 gap-4 active:bg-slate-50 cursor-pointer"
              >
                {/* Icon Column */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.bg} ${styles.text}`}>
                  <span className="material-symbols-outlined !text-xl">{styles.icon}</span>
                </div>

                {/* Main Info Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.text}`}>
                      {styles.label}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(log.timestamp)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 truncate text-base">{log.title}</h3>
                  <p className="text-sm text-slate-500 truncate">{log.subtitle}</p>
                </div>

                {/* Arrow Column */}
                <button className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
              </div>

              {/* Expanded Details - Conditionally Visible */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    {/* Description */}
                    {log.description && (
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {log.description}
                        </p>
                      </div>
                    )}

                    {/* Specific Data Blocks */}
                    {log.details && (
                      <div className="grid grid-cols-2 gap-3">
                        {log.details.plate && (
                          <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Placa</p>
                            <p className="font-mono text-base text-slate-900 font-bold">{log.details.plate}</p>
                          </div>
                        )}
                        {log.details.destination && (
                          <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Destino</p>
                            <p className="font-mono text-base text-slate-900 font-bold">{log.details.destination}</p>
                          </div>
                        )}
                        {log.details.visitorType && (
                          <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Clasificación</p>
                            <p className="text-sm text-slate-900 font-bold capitalize">{log.details.visitorType.toLowerCase()}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evidence Image */}
                    {log.imageUrl && (
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Evidencia</p>
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                          <img src={log.imageUrl} alt="Evidencia" className="w-full h-48 object-cover" />
                        </div>
                      </div>
                    )}

                    {/* Encomienda: Abrir modal de recogida */}
                    {log.type === EventType.ENCOMIENDA && log.status === 'ABIERTO' && onUpdateLog && (
                      <button
                        onClick={() => setPickupModalLog(log)}
                        className="w-full py-3 bg-violet-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-violet-600/20"
                      >
                        <span className="material-symbols-outlined !text-lg">inventory_2</span>
                        Gestionar recogida
                      </button>
                    )}
                    {log.type === EventType.ENCOMIENDA && log.status === 'CERRADO' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-2xl px-4 py-3">
                          <span className="material-symbols-outlined !text-lg">verified</span>
                          <span className="text-sm font-bold">
                            {log.details?.pickup_name
                              ? `Recogida por ${log.details.pickup_name}`
                              : 'Entregada al residente'}
                          </span>
                        </div>
                        {log.details?.pickup_signature_url && (
                          <div>
                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Firma</p>
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                              <img src={log.details.pickup_signature_url} alt="Firma" className="w-full h-20 object-contain" />
                            </div>
                          </div>
                        )}
                        {log.details?.returned && (
                          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 rounded-2xl px-4 py-3">
                            <span className="material-symbols-outlined !text-lg">undo</span>
                            <span className="text-sm font-bold">Devuelta al remitente</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Factura lote: badge + botón para registrar entrega individual */}
                    {log.type === EventType.FACTURA && log.details?.mode === 'lote' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-teal-700 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
                          <span className="material-symbols-outlined !text-lg">hourglass_top</span>
                          <span className="text-sm font-bold">
                            {log.details.cantidad} factura(s) en distribución
                          </span>
                        </div>
                        <button
                          onClick={() => onNavigate(AppView.FACTURA_ENTREGA_FORM)}
                          className="w-full py-3 bg-teal-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-teal-600/20"
                        >
                          <span className="material-symbols-outlined !text-lg">assignment_turned_in</span>
                          Registrar entrega individual
                        </button>
                      </div>
                    )}

                    {/* Factura entrega: mostrar firma */}
                    {log.type === EventType.FACTURA && log.details?.mode === 'entrega' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                          <span className="material-symbols-outlined !text-lg">verified</span>
                          <span className="text-sm font-bold">Entregada a {log.details.residente}</span>
                        </div>
                        {log.signature_url && (
                          <div>
                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Firma</p>
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                              <img src={log.signature_url} alt="Firma" className="w-full h-24 object-contain" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* PackagePickupModal */}
      {pickupModalLog && onUpdateLog && (
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

export default MinutaView;
