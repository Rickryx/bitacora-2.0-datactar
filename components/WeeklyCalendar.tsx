import React from 'react';

interface WeeklyCalendarProps {
    shifts: any[];
    profiles: any[];
    onEditShift: (shift: any) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ shifts, profiles, onEditShift }) => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Get start of current week (Monday)
    const getStartOfWeek = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    };

    const startOfWeek = getStartOfWeek();

    const getDayDate = (index: number) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        return date;
    };

    const guards = profiles.filter(p => p.role === 'GUARD');

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 sticky left-0 bg-slate-50 z-10 w-40">Guardia</th>
                            {days.map((day, i) => (
                                <th key={day} className="p-4 text-[10px] font-black uppercase text-slate-400">
                                    <div className="flex flex-col">
                                        <span>{day}</span>
                                        <span className="text-slate-300 font-bold">{getDayDate(i).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {guards.map(guard => (
                            <tr key={guard.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 sticky left-0 bg-white border-r border-slate-50 z-10 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                            {guard.avatar_url ? <img src={guard.avatar_url} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-300 text-sm">person</span>}
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 truncate max-w-[100px]">{guard.full_name}</span>
                                    </div>
                                </td>
                                {days.map((_, dayIndex) => {
                                    const dateStr = getDayDate(dayIndex).toLocaleDateString();
                                    const dayShifts = shifts.filter(s => s.user_id === guard.id && new Date(s.scheduled_start).toLocaleDateString() === dateStr);

                                    return (
                                        <td key={dayIndex} className="p-2 min-h-[80px]">
                                            <div className="space-y-1">
                                                {dayShifts.map(s => (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => onEditShift(s)}
                                                        className={`p-2 rounded-xl text-[9px] font-black cursor-pointer transform hover:scale-105 transition-all shadow-sm ${s.status === 'ACTIVE' ? 'bg-green-500 text-white shadow-green-200' :
                                                                s.status === 'COMPLETED' ? 'bg-blue-500 text-white shadow-blue-200' :
                                                                    'bg-slate-100 text-slate-500 hover:bg-white hover:border-primary border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="truncate uppercase opacity-80">{s.entities?.name}</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined !text-[10px]">schedule</span>
                                                                <span>{new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {dayShifts.length === 0 && (
                                                    <div className="h-full min-h-[40px] border border-dashed border-slate-100 rounded-xl"></div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-slate-50/50 flex gap-4">
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-200"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-green-500"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activo</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completado</span>
                </div>
            </div>
        </div>
    );
};

export default WeeklyCalendar;
