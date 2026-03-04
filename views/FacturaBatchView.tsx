
import React, { useState } from 'react';
import { LogEntry, EventType, AppView } from '../types';

interface FacturaBatchViewProps {
  onBack: () => void;
  onSubmit: (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>) => void;
}

const SERVICIOS = [
  { id: 'Agua', label: 'Agua', icon: 'water_drop' },
  { id: 'Gas', label: 'Gas', icon: 'local_fire_department' },
  { id: 'Energía', label: 'Energía', icon: 'bolt' },
  { id: 'Internet', label: 'Internet', icon: 'wifi' },
  { id: 'TV/Cable', label: 'TV / Cable', icon: 'tv' },
  { id: 'Aseo', label: 'Aseo', icon: 'delete' },
  { id: 'Otro', label: 'Otro', icon: 'more_horiz' },
];

const FacturaBatchView: React.FC<FacturaBatchViewProps> = ({ onBack, onSubmit }) => {
  const [servicio, setServicio] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [notas, setNotas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicio || !cantidad) return;

    onSubmit({
      type: EventType.FACTURA,
      occurredAt: new Date(),
      title: `Facturas de ${servicio} recibidas`,
      subtitle: `${cantidad} facturas en recepción — pendientes de distribuir`,
      description: notas || undefined,
      details: {
        mode: 'lote',
        servicio,
        cantidad: parseInt(cantidad, 10),
        notas,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-700">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Llegada de Facturas</h1>
          <p className="text-xs text-slate-400">Registra el lote completo que llegó hoy</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 pb-32">
        {/* Tipo de servicio */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Tipo de servicio <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICIOS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServicio(s.id)}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all ${
                  servicio === s.id
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-100 text-slate-700 hover:border-teal-200'
                }`}
              >
                <span className="material-symbols-outlined !text-lg">{s.icon}</span>
                <span className="text-sm font-bold">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cantidad */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Cantidad de facturas <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            placeholder="Ej: 42"
            className="w-full border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold text-lg focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Ej: Llegaron con el mensajero de Codensa a las 10am..."
            rows={3}
            className="w-full border border-slate-200 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-teal-500 transition resize-none"
          />
        </div>

        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-teal-600 text-xl shrink-0">info</span>
          <p className="text-xs text-teal-700 leading-relaxed">
            Este registro indica que las facturas <strong>llegaron a recepción</strong>.
            Cuando entregues cada una al residente, usa <strong>"Registrar Entrega"</strong> desde la Bitácora.
          </p>
        </div>
      </form>

      {/* Submit */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-white/95 backdrop-blur-md border-t border-slate-100">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!servicio || !cantidad}
          className="w-full bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-black shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all"
        >
          Registrar llegada de lote
        </button>
      </div>
    </div>
  );
};

export default FacturaBatchView;
