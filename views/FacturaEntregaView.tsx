
import React, { useState } from 'react';
import { LogEntry, EventType } from '../types';
import SignatureCanvas from '../components/SignatureCanvas';

interface FacturaEntregaViewProps {
  onBack: () => void;
  onSubmit: (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>) => void;
}

const SERVICIOS = ['Agua', 'Gas', 'Energía', 'Internet', 'TV/Cable', 'Aseo', 'Otro'];

const FacturaEntregaView: React.FC<FacturaEntregaViewProps> = ({ onBack, onSubmit }) => {
  const [servicio, setServicio] = useState('');
  const [unidad, setUnidad] = useState('');
  const [residente, setResidente] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  const canSubmit = servicio && unidad && residente && signatureUrl;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      type: EventType.FACTURA,
      occurredAt: new Date(),
      title: `Factura entregada — Apto ${unidad}`,
      subtitle: `${servicio} → ${residente}`,
      signature_url: signatureUrl,
      details: {
        mode: 'entrega',
        servicio,
        unidad,
        residente,
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
          <h1 className="text-xl font-extrabold text-slate-900">Entrega de Factura</h1>
          <p className="text-xs text-slate-400">Registra la entrega al residente con firma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5 pb-32">
        {/* Tipo de servicio */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Tipo de factura <span className="text-red-500">*</span>
          </label>
          <select
            value={servicio}
            onChange={e => setServicio(e.target.value)}
            className="w-full border border-slate-200 rounded-2xl p-4 text-slate-900 font-medium bg-white focus:outline-none focus:border-teal-500 transition"
          >
            <option value="">Selecciona el servicio…</option>
            {SERVICIOS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Unidad */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Apartamento / Unidad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={unidad}
            onChange={e => setUnidad(e.target.value)}
            placeholder="Ej: 301, Torre B Apto 12"
            className="w-full border border-slate-200 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        {/* Nombre del residente */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Nombre del residente <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={residente}
            onChange={e => setResidente(e.target.value)}
            placeholder="Nombre completo"
            className="w-full border border-slate-200 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        {/* Firma */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Firma del residente <span className="text-red-500">*</span>
          </label>
          <SignatureCanvas
            onSave={url => setSignatureUrl(url)}
            onClear={() => setSignatureUrl('')}
          />
          {!signatureUrl && (
            <p className="text-[11px] text-amber-600 font-bold text-center">
              La firma es obligatoria para registrar la entrega
            </p>
          )}
        </div>
      </form>

      {/* Submit */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-white/95 backdrop-blur-md border-t border-slate-100">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-black shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all"
        >
          Confirmar entrega con firma
        </button>
      </div>
    </div>
  );
};

export default FacturaEntregaView;
