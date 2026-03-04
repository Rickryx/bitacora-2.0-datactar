
import React, { useState } from 'react';
import SignatureCanvas from './SignatureCanvas';

interface PackagePickupModalProps {
  packageTitle: string;
  onConfirm: (pickupName: string, signatureUrl: string) => void;
  onReturn: () => void;
  onCancel: () => void;
}

const PackagePickupModal: React.FC<PackagePickupModalProps> = ({
  packageTitle,
  onConfirm,
  onReturn,
  onCancel,
}) => {
  const [pickupName, setPickupName] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [mode, setMode] = useState<'pickup' | 'return'>('pickup');

  const canConfirm = pickupName.trim().length > 0 && signatureUrl.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Recogida de encomienda</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{packageTitle}</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-300 hover:text-slate-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setMode('pickup')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'pickup' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400'
            }`}
          >
            Entregada al residente
          </button>
          <button
            onClick={() => setMode('return')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'return' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            Devolver al remitente
          </button>
        </div>

        {mode === 'pickup' ? (
          <>
            {/* Nombre del residente */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nombre de quien recoge <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pickupName}
                onChange={e => setPickupName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full border border-slate-200 rounded-2xl p-3.5 text-slate-900 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            {/* Firma */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Firma <span className="text-red-500">*</span>
              </label>
              <SignatureCanvas
                onSave={url => setSignatureUrl(url)}
                onClear={() => setSignatureUrl('')}
              />
            </div>

            <button
              disabled={!canConfirm}
              onClick={() => onConfirm(pickupName, signatureUrl)}
              className="w-full py-4 bg-violet-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-violet-600/20"
            >
              <span className="material-symbols-outlined !text-lg">check_circle</span>
              Confirmar entrega
            </button>
          </>
        ) : (
          <>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-orange-500 shrink-0">info</span>
              <p className="text-sm text-orange-700 leading-relaxed">
                Esta acción marcará la encomienda como <strong>devuelta al remitente</strong>. Esta acción quedará registrada en la bitácora.
              </p>
            </div>
            <button
              onClick={onReturn}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
            >
              <span className="material-symbols-outlined !text-lg">undo</span>
              Registrar devolución
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PackagePickupModal;
