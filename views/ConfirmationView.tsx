import React, { useState, useEffect } from 'react';
import { EventType } from '../types';
import SignatureCanvas from '../components/SignatureCanvas';
import { supabase } from '../services/supabase';

interface ConfirmationViewProps {
  data: any;
  onConfirm: (finalData: any) => void;
  onCancel: () => void;
}

/* Helper to format Date for input[type="datetime-local"] */
const formatDateForInput = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const ConfirmationView: React.FC<ConfirmationViewProps> = ({ data, onConfirm, onCancel }) => {
  const [editedData, setEditedData] = useState({
    ...(data || {}),
    occurredAt: data?.occurredAt || new Date(),
    signature_url: data?.signature_url || undefined
  });
  const [isSigning, setIsSigning] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Update local state if props change
  useEffect(() => {
    if (data) {
      setEditedData({
        ...data,
        occurredAt: data.occurredAt || new Date(),
        signature_url: data.signature_url || undefined
      });
    }
  }, [data]);

  if (!data || !editedData) return null;

  const handleConfirm = () => {
    onConfirm({
      type: editedData.type as EventType,
      title: editedData.details?.name || editedData.summary || 'Nuevo Evento',
      subtitle: `${editedData.details?.name || ''} ${editedData.details?.destination ? '→ ' + editedData.details.destination : ''}`,
      description: editedData.details?.description || editedData.summary,
      imageUrl: editedData.imageUrl,
      details: {
        ...editedData.details,
        signature_url: editedData.signature_url
      },
      signature_url: editedData.signature_url,
      occurredAt: editedData.occurredAt
    });
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setUploading(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `signature_${Date.now()}.png`;
      const filePath = `signatures/${fileName}`;

      const { data, error } = await supabase.storage
        .from('files')
        .upload(filePath, blob, { contentType: 'image/png' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(filePath);

      setEditedData(prev => ({
        ...prev,
        signature_url: publicUrl
      }));
      setIsSigning(false);
    } catch (e: any) {
      alert("Error guardando firma: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const updateDate = (dateString: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      occurredAt: new Date(dateString)
    }));
  };

  const updateDetail = (key: string, value: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      details: {
        ...prev.details,
        [key]: value
      }
    }));
  };

  const updateType = (newType: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      type: newType
    }));
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="flex items-center justify-between px-6 pt-12 pb-6 bg-white border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-slate-900 flex items-center">
            <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Confirmar Registro</h1>
        </div>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-bold">
          <span className="material-symbols-outlined !text-sm">auto_awesome</span>
          IA ACTIVA
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-start gap-4 bg-primary/5 p-5 rounded-3xl border border-primary/10">
          <span className="material-symbols-outlined text-primary !text-3xl">edit_note</span>
          <p className="text-sm text-slate-600 leading-relaxed">
            Verifica la información. Puedes editar cualquier campo tocando sobre él.
          </p>
        </div>

        {editedData.imageUrl && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Evidencia Fotográfica</label>
            <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              <img src={editedData.imageUrl} alt="Evidencia" className="w-full h-48 object-cover" />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Detalles del Evento</label>

          {/* Date Time Picker */}
          <div className="bg-white p-2 rounded-3xl border border-slate-100 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 pt-2">Fecha y Hora del Evento</label>
            <div className="flex items-center">
              <input
                type="datetime-local"
                value={formatDateForInput(editedData.occurredAt)}
                onChange={(e) => updateDate(e.target.value)}
                className="w-full text-lg font-bold text-slate-900 border-none focus:ring-0 px-3 pb-3 pt-1"
              />
            </div>
          </div>

          {/* Event Type Dropdown */}
          <div className="bg-white p-2 rounded-3xl border border-slate-100 flex flex-col shadow-sm relative focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 pt-2">Tipo de Evento</label>
            <div className="relative">
              <select
                value={editedData.type}
                onChange={(e) => updateType(e.target.value)}
                className="w-full appearance-none bg-transparent text-lg font-bold text-slate-900 border-none focus:ring-0 px-3 pb-3 pt-1"
              >
                <option value="VISITOR">Visitante</option>
                <option value="DELIVERY">Domicilio</option>
                <option value="SERVICE">Servicio Técnico</option>
                <option value="PROVEEDOR">Proveedor</option>
                <option value="ROUND">Ronda</option>
                <option value="INCIDENT">Incidente</option>
                <option value="INFO">Nota / Info</option>
              </select>
              <div className="absolute right-3 top-1 pointer-events-none text-slate-400">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div className="bg-white p-2 rounded-3xl border border-slate-100 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 pt-2">Nombre / Título</label>
            <div className="flex items-center">
              <input
                type="text"
                value={editedData.details?.name || ''}
                onChange={(e) => updateDetail('name', e.target.value)}
                placeholder="Nombre de la persona o empresa"
                className="w-full text-lg font-bold text-slate-900 border-none focus:ring-0 px-3 pb-3 pt-1 placeholder:text-slate-300"
              />
              <span className="material-symbols-outlined text-slate-300 mr-3">edit</span>
            </div>
          </div>

          {/* Destination Field (Numeric) */}
          <div className="bg-white p-2 rounded-3xl border border-slate-100 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 pt-2">Destino / Interior</label>
            <div className="flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={editedData.details?.destination || ''}
                onChange={(e) => updateDetail('destination', e.target.value)}
                placeholder="Ej. 101, 502"
                className="w-full text-lg font-bold text-slate-900 border-none focus:ring-0 px-3 pb-3 pt-1 placeholder:text-slate-300"
              />
              <span className="material-symbols-outlined text-slate-300 mr-3">tag</span>
            </div>
          </div>

          {/* Plate Field */}
          <div className="bg-white p-2 rounded-3xl border border-slate-100 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 pt-2">Placa (Opcional)</label>
            <div className="flex items-center">
              <input
                type="text"
                value={editedData.details?.plate || ''}
                onChange={(e) => updateDetail('plate', e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="w-full text-lg font-bold text-slate-900 border-none focus:ring-0 px-3 pb-3 pt-1 placeholder:text-slate-300 uppercase"
              />
              <span className="material-symbols-outlined text-slate-300 mr-3">directions_car</span>
            </div>
          </div>

          {/* Description Field */}
          <div className="bg-white p-2 rounded-3xl border border-slate-100 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-3 pt-2">Notas Adicionales</label>
            <textarea
              value={editedData.details?.description || ''}
              onChange={(e) => updateDetail('description', e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              className="w-full text-sm font-medium text-slate-700 border-none focus:ring-0 px-3 pb-3 pt-1 placeholder:text-slate-300 resize-none"
            />
          </div>

        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Información Faltante</label>

          {isSigning ? (
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <SignatureCanvas
                onSave={handleSignatureSave}
                onClear={() => setEditedData(prev => ({ ...prev, signature_url: undefined }))}
              />
              <button
                onClick={() => setIsSigning(false)}
                className="w-full mt-4 text-slate-400 text-xs font-bold uppercase"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSigning(true)}
              className={`w-full ${editedData.signature_url ? 'bg-green-50 border-green-100' : 'bg-primary/5 border-primary/20'} border-2 border-dashed p-5 rounded-3xl flex justify-between items-center active:bg-primary/10 transition-colors`}
            >
              <div className="text-left">
                <p className={`text-xs ${editedData.signature_url ? 'text-green-600' : 'text-primary'} font-bold`}>
                  {editedData.signature_url ? 'Firma Capturada' : 'Firma Requerida'}
                </p>
                {editedData.signature_url ? (
                  <img src={editedData.signature_url} className="h-8 mt-1 object-contain" alt="Firma" />
                ) : (
                  <p className="text-sm text-slate-500 italic">No registrada aún</p>
                )}
              </div>
              <div className={`flex items-center gap-1 ${editedData.signature_url ? 'text-green-600' : 'text-primary'} font-bold text-sm`}>
                <span className="material-symbols-outlined">{editedData.signature_url ? 'check_circle' : 'add_circle'}</span>
                {editedData.signature_url ? 'Cambiar' : 'Agregar'}
              </div>
            </button>
          )}
        </div>
      </main>

      <footer className="bg-white p-8 pb-12 border-t border-slate-100 space-y-4">
        <button
          onClick={handleConfirm}
          disabled={uploading}
          className={`w-full ${uploading ? 'bg-slate-300' : 'bg-primary shadow-primary/25'} text-white py-5 rounded-2xl font-bold text-xl shadow-xl active:scale-[0.98] transition-all`}
        >
          {uploading ? 'Guardando firma...' : 'Confirmar y Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={uploading}
          className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all"
        >
          Cancelar
        </button>
      </footer>
    </div>
  );
};

export default ConfirmationView;
