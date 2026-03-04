
import React, { useState, useRef } from 'react';
import { EventType } from '../types';
import { supabase } from '../services/supabase';

interface PackageFormViewProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const TRANSPORTADORAS = ['DHL', 'Coordinadora', 'Envia', 'Servientrega', 'Interrapidísimo', 'FedEx', 'Rappi', 'Otra'];

const PackageFormView: React.FC<PackageFormViewProps> = ({ onBack, onSubmit }) => {
  const [remitente, setRemitente] = useState('');
  const [transportadora, setTransportadora] = useState(TRANSPORTADORAS[0]);
  const [unidad, setUnidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `evidence/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('files').upload(filePath, file);
    if (error) {
      alert("Error subiendo foto: " + error.message);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(filePath);
      setImageUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidad) return alert("Indique el apartamento/unidad destino.");

    onSubmit({
      type: EventType.ENCOMIENDA,
      title: 'Encomienda en Recepción',
      subtitle: `${transportadora} → Apto ${unidad}`,
      description: descripcion
        ? `Remitente: ${remitente || 'Desconocido'}. ${descripcion}`
        : `Paquete de ${transportadora} en recepción para ${unidad}. Remitente: ${remitente || 'Desconocido'}.`,
      imageUrl,
      status: 'ABIERTO',
      details: { remitente, transportadora, unidad, descripcion }
    });
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="flex items-center gap-4 px-6 pt-12 pb-6 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="text-slate-900 flex items-center">
          <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight">Registrar Encomienda</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <form className="p-6 space-y-8" onSubmit={handleSubmit}>

          {/* Transportadora */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Transportadora</label>
            <div className="flex flex-wrap gap-2">
              {TRANSPORTADORAS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTransportadora(t)}
                  className={`px-4 py-2.5 rounded-full text-sm font-bold shadow-sm transition-colors ${transportadora === t ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Unidad destino */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Apartamento / Unidad Destino *</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg"
              placeholder="Ej. 502 - A"
              type="text"
              value={unidad}
              onChange={e => setUnidad(e.target.value)}
            />
          </div>

          {/* Remitente */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Remitente / Origen</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg"
              placeholder="Ej. Amazon, nombre de persona..."
              type="text"
              value={remitente}
              onChange={e => setRemitente(e.target.value)}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Descripción (opcional)</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-base"
              placeholder="Ej. Caja mediana, sobre..."
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          {/* Foto del paquete */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between active:bg-slate-50 transition-all ${imageUrl ? 'border-violet-400 bg-violet-50' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${imageUrl ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600'}`}>
                {imageUrl ? (
                  <img src={imageUrl} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                ) : (
                  <span className="material-symbols-outlined !text-4xl">photo_camera</span>
                )}
              </div>
              <div className="text-left font-bold">
                <p className="text-base text-slate-900">{imageUrl ? 'Foto Capturada' : 'Foto del Paquete'}</p>
                <p className="text-xs text-slate-400 font-medium">Opcional — evidencia visual</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-300">{imageUrl ? 'check_circle' : 'chevron_right'}</span>
          </button>
        </form>
      </main>

      <footer className="bg-white/80 backdrop-blur-xl p-6 border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20">
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98] ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-violet-600 text-white shadow-violet-600/25'}`}
        >
          {uploading ? 'Subiendo foto...' : 'Registrar en Recepción'}
        </button>
      </footer>
    </div>
  );
};

export default PackageFormView;
