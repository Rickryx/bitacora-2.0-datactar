
import React, { useState, useRef } from 'react';
import { EventType } from '../types';
import SignatureCanvas from '../components/SignatureCanvas';
import { supabase } from '../services/supabase';

interface VisitorFormViewProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const SERVICIOS_PUBLICOS = ['Agua', 'Gas', 'Energía', 'Internet', 'TV/Cable', 'Aseo', 'Otro'];

const VisitorFormView: React.FC<VisitorFormViewProps> = ({ onBack, onSubmit }) => {
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [dest, setDest] = useState('');
  const [plate, setPlate] = useState('');
  const [tipoServicio, setTipoServicio] = useState(SERVICIOS_PUBLICOS[0]);
  const [type, setType] = useState<EventType>(EventType.VISITOR);
  const isFactura = type === EventType.FACTURA;
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);
  const [isSigning, setIsSigning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `evidence/${fileName}`;

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

  const handleSignatureSave = async (dataUrl: string) => {
    // Convert base64 to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    setUploading(true);
    const fileName = `signature_${Date.now()}.png`;
    const filePath = `signatures/${fileName}`;

    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, blob, { contentType: 'image/png' });

    if (error) {
      alert("Error subiendo firma: " + error.message);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(filePath);
      setSignatureUrl(publicUrl);
      setIsSigning(false);
    }
    setUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isFactura) {
      if (!dest) return alert("Indique el apartamento/unidad destino.");
      onSubmit({
        type: EventType.FACTURA,
        title: 'Factura de Servicio',
        subtitle: `${tipoServicio} → Apto ${dest}`,
        description: `Factura de ${tipoServicio} recibida en portería para ${dest}.`,
        imageUrl,
        details: { tipoServicio, dest }
      });
      return;
    }

    if (!name || !dest || !doc) return alert("Complete los campos requeridos (incluyendo cédula).");
    if (!signatureUrl) return alert("Se requiere la firma del visitante.");

    let title = 'Visitante';
    if (type === EventType.DELIVERY) title = 'Domicilio';
    if (type === EventType.SERVICE) title = 'Servicio Público';

    onSubmit({
      type: type,
      title: title,
      subtitle: `${name} → ${dest}`,
      description: `Ingreso registrado manualmente. ID: ${doc}`,
      imageUrl,
      document_id: doc,
      signature_url: signatureUrl,
      details: { name, doc, dest, plate, signature_url: signatureUrl }
    });
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="flex items-center gap-4 px-6 pt-12 pb-6 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="text-slate-900 flex items-center">
          <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight">Registro Manual</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <form className="p-6 space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Categoría del Visitante</label>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-6 px-6">
              <button
                type="button"
                onClick={() => setType(EventType.VISITOR)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-colors ${type === EventType.VISITOR ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                Familiar/Amigo
              </button>
              <button
                type="button"
                onClick={() => setType(EventType.DELIVERY)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-colors ${type === EventType.DELIVERY ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                Domicilio
              </button>
              <button
                type="button"
                onClick={() => setType(EventType.SERVICE)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-colors ${type === EventType.SERVICE ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                Servicios
              </button>
              <button
                type="button"
                onClick={() => setType(EventType.FACTURA)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-colors ${isFactura ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                Factura
              </button>
            </div>
          </div>

          {isFactura ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Tipo de Servicio</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICIOS_PUBLICOS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTipoServicio(s)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${tipoServicio === s ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Apartamento / Unidad</label>
                <input
                  className="w-full bg-white border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg"
                  placeholder="Ej. 203 - B"
                  type="text"
                  value={dest}
                  onChange={e => setDest(e.target.value)}
                />
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Nombre Completo</label>
              <input
                className="w-full bg-white border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg"
                placeholder="Ej. Juan Pérez"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Número de Cédula</label>
              <input
                className="w-full bg-white border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg"
                placeholder="Obligatorio"
                type="text"
                value={doc}
                onChange={e => setDoc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Destino</label>
                <input
                  className="w-full bg-white border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg"
                  placeholder="1203 - B"
                  type="text"
                  value={dest}
                  onChange={e => setDest(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Placa</label>
                <input
                  className="w-full bg-white border-slate-100 rounded-2xl px-5 py-4 focus:ring-primary focus:border-primary text-lg uppercase"
                  placeholder="ABC-123"
                  type="text"
                  value={plate}
                  onChange={e => setPlate(e.target.value)}
                />
              </div>
            </div>
          </div>
          )}

          {!isFactura && (
          <div className="space-y-6 pt-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validación de Identidad</label>
                {signatureUrl && <span className="material-symbols-outlined text-green-500">verified</span>}
              </div>

              {isSigning ? (
                <SignatureCanvas
                  onSave={handleSignatureSave}
                  onClear={() => setSignatureUrl(undefined)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSigning(true)}
                  className={`w-full group rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 py-8 ${signatureUrl ? 'border-primary/20 bg-primary/5' : 'border-slate-200 hover:border-primary/40'}`}
                >
                  {signatureUrl ? (
                    <img src={signatureUrl} className="h-16 object-contain" alt="Firma" />
                  ) : (
                    <>
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">draw</span>
                      </div>
                      <span className="text-sm font-bold text-slate-600">Firmar Ingreso</span>
                    </>
                  )}
                </button>
              )}
            </div>

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
              className={`w-full bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between active:bg-slate-50 transition-all ${imageUrl ? 'border-primary bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${imageUrl ? 'bg-primary text-white' : 'bg-primary/5 text-primary'}`}>
                  {imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover rounded-2xl shadow-sm" alt="Preview" />
                  ) : (
                    <span className="material-symbols-outlined !text-4xl">photo_camera</span>
                  )}
                </div>
                <div className="text-left font-bold">
                  <p className="text-base text-slate-900">{imageUrl ? 'Foto Capturada' : 'Capturar Foto de ID'}</p>
                  <p className="text-xs text-slate-400 font-medium tracking-tight">Registro fotográfico del documento</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300">{imageUrl ? 'check_circle' : 'chevron_right'}</span>
            </button>
          </div>
          )}
        </form>
      </main>

      <footer className="bg-white/80 backdrop-blur-xl p-6 border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20">
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98] ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white shadow-primary/25'}`}
        >
          {uploading ? 'Subiendo archivos...' : 'Guardar y Finalizar'}
        </button>
      </footer>
    </div>
  );
};

export default VisitorFormView;
