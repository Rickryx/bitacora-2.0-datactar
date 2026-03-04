import React, { useState } from 'react';

interface ShiftValidationModalProps {
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    title: string;
    message: string;
}

const ShiftValidationModal: React.FC<ShiftValidationModalProps> = ({ onConfirm, onCancel, title, message }) => {
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                        <span className="material-symbols-outlined !text-4xl">warning</span>
                    </div>

                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{title}</h3>
                        <p className="text-sm text-slate-500 font-medium">{message}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Motivo de finalización</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none"
                            placeholder="Ej. Relevo adelantado, urgencia personal..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onCancel}
                            className="py-4 rounded-2xl text-slate-400 font-black text-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(reason)}
                            disabled={!reason.trim()}
                            className="py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                        >
                            Finalizar Turno
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShiftValidationModal;
