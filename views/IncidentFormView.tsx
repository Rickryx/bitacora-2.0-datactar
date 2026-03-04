import React, { useState, useRef } from 'react';
import { EventType } from '../types';
import { supabase } from '../services/supabase';

interface IncidentFormViewProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const IncidentFormView: React.FC<IncidentFormViewProps> = ({ onBack, onSubmit }) => {
  const [type, setType] = useState('Falla Eléctrica');
  const [loc, setLoc] = useState('Torre 2 - Zona Común');
  const [desc, setDesc] = useState('Breaker principal disparado en zona común');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `incidents/${fileName}`;

      const { data, error } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (error) {
        alert("Error subiendo foto: " + error.message);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(filePath);
        setImageUrl(publicUrl);
      }
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return alert("La evidencia fotográfica es obligatoria para incidentes.");
    onSubmit({
      type: EventType.INCIDENT,
      title: 'Incidente',
      subtitle: `${type} - ${loc}`,
      description: desc,
      imageUrl,
      details: { priority: 'ALTA' }
    });
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 p-6 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-600">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Registro de Incidente</h1>
        </div>
        <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Prioridad Alta
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-start gap-5">
            <div className="bg-red-500/10 p-3.5 rounded-2xl">
              <span className="material-symbols-outlined text-red-500 !text-3xl">bolt</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tipo de Incidente</p>
              <input
                className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-900 focus:ring-0"
                value={type}
                onChange={e => setType(e.target.value)}
              />
            </div>
          </div>
          <div className="h-px bg-slate-50"></div>
          <div className="flex items-start gap-5">
            <div className="bg-primary/10 p-3.5 rounded-2xl">
              <span className="material-symbols-outlined text-primary !text-3xl">location_on</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ubicación</p>
              <input
                className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-900 focus:ring-0"
                value={loc}
                onChange={e => setLoc(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Evidencia</h3>
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
            className={`w-full flex flex-col items-center justify-center gap-4 py-8 bg-white border-2 border-dashed rounded-3xl transition-colors group overflow-hidden ${imageUrl ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary'}`}
          >
            {imageUrl ? (
              <div className="w-full flex flex-col items-center gap-3">
                <img src={imageUrl} className="max-h-48 rounded-xl shadow-md border-2 border-white" alt="Evidence Preview" />
                <span className="text-primary font-bold">Cambiar Foto</span>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 p-6 rounded-full group-hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined !text-5xl text-slate-300 group-hover:text-primary">photo_camera</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-slate-800">Tomar Foto</span>
                  <span className="text-xs text-red-500 font-bold tracking-wider">(REQUERIDO)</span>
                </div>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Detalle del Evento</h3>
          <textarea
            className="w-full rounded-3xl border-slate-100 bg-white text-lg text-slate-800 focus:ring-primary focus:border-primary p-6"
            rows={4}
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
        </div>
      </main>

      <footer className="p-8 pb-12 bg-white border-t border-slate-100">
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className={`w-full ${uploading ? 'bg-slate-300' : 'bg-primary hover:bg-blue-700 shadow-primary/30'} text-white font-bold py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3`}
        >
          <span className="material-symbols-outlined !text-3xl">{uploading ? 'sync' : 'save'}</span>
          <span className="text-xl">{uploading ? 'Subiendo...' : 'Guardar incidente'}</span>
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">Paso 2 de 2: Revisión final</p>
      </footer>
    </div>
  );
};

export default IncidentFormView;
