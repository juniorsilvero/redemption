import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { User, Users, X, ZoomIn, Calendar, Clock, Home, Briefcase, Crown, MapPin, AlertCircle, Pill, Activity, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const WorkerInfoModal = React.memo(function WorkerInfoModal({ worker, cells, allWorkers, allPassers, isOpen, onClose }) {
    const [showExpandedPhoto, setShowExpandedPhoto] = useState(false);

    // Helpers for Prayer Clock (matching logic from Prayer.jsx)
    const getPrayerSlotDetails = (slotId) => {
        if (!slotId) return null;
        try {
            // slot-male-5 or slot-female-10
            const parts = slotId.split('-');
            const index = parseInt(parts[2], 10);

            if (isNaN(index)) return null;

            const days = ['Sexta', 'Sábado', 'Domingo'];
            let dayIndex = 0;
            let hour = 19; // Starts Friday 19:00

            for (let i = 0; i < index; i++) {
                hour++;
                if (hour >= 24) {
                    hour = 0;
                    dayIndex++;
                }
            }

            return {
                day: days[dayIndex] || 'Desconhecido',
                time: `${hour.toString().padStart(2, '0')}:00`
            };
        } catch (e) {
            return { day: 'Erro', time: '??:??' };
        }
    };

    // Fetch Work Scales
    const { data: workScales } = useQuery({
        queryKey: ['worker_scales_info', worker?.id],
        queryFn: async () => {
            if (!worker?.id) return [];
            const { data } = await supabase
                .from('work_scale')
                .select(`
                    *,
                    areas (name)
                `)
                .eq('worker_id', worker.id);
            return data || [];
        },
        enabled: !!worker?.id && isOpen
    });

    // Fetch Fixed Scales
    const { data: fixedScales } = useQuery({
        queryKey: ['worker_fixed_info', worker?.id],
        queryFn: async () => {
            if (!worker?.id) return [];
            const { data } = await supabase
                .from('fixed_scales')
                .select('*');

            // Filter locally since checking array contains is easier
            return (data || []).filter(scale =>
                scale.members?.includes(worker.id) ||
                scale.leader_ids?.includes(worker.id)
            );
        },
        enabled: !!worker?.id && isOpen
    });

    // Fetch Prayer Clock
    const { data: prayerSlots } = useQuery({
        queryKey: ['worker_prayer_info', worker?.id],
        queryFn: async () => {
            if (!worker?.id) return [];
            const { data } = await supabase
                .from('prayer_clock')
                .select('*')
                .or(`worker_1_id.eq.${worker.id},worker_2_id.eq.${worker.id}`);
            return data || [];
        },
        enabled: !!worker?.id && isOpen
    });

    // Fetch Room Leadership
    const { data: roomLeadership } = useQuery({
        queryKey: ['worker_room_info', worker?.id],
        queryFn: async () => {
            if (!worker?.id) return [];
            const { data } = await supabase
                .from('rooms')
                .select('*');

            return (data || []).filter(room => room.room_leader_ids?.includes(worker.id));
        },
        enabled: !!worker?.id && isOpen
    });

    if (!worker) return null;

    const cell = cells?.find(c => c.id === worker.cell_id);
    const isWorkerType = 'is_room_leader' in worker || worker.type === 'worker' || worker.type === 'Trabalhador';


    // Find the responsible worker if this is a passer
    const responsibleWorker = !isWorkerType && worker.responsible_worker_id
        ? allWorkers?.find(w => w.id === worker.responsible_worker_id)
        : null;


    // Status Badge Component
    const StatusBadge = ({ label, active, colorClass }) => (
        <span className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border",
            active ? colorClass : "bg-slate-50 text-slate-400 border-slate-200 opacity-50"
        )}>
            {label}
        </span>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Guerreiro" maxWidth="max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 lg:max-h-[70vh]">

                    {/* LEFT COLUMN: PROFILE & PERSONAL INFO */}
                    <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6 space-y-5 lg:overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={cn(
                                    "h-28 w-28 rounded-full border-4 border-slate-50 shadow-sm flex items-center justify-center bg-slate-100 text-slate-400 overflow-hidden mb-3",
                                    worker.photo_url && "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all"
                                )}
                                onClick={() => worker.photo_url && setShowExpandedPhoto(true)}
                            >
                                {worker.photo_url ? (
                                    <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10" />
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 leading-tight">{worker.name}</h3>
                            <p className="text-lg font-medium text-slate-600 mb-2">{worker.surname}</p>

                            <div className="flex flex-wrap justify-center gap-2 mb-4">
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    {isWorkerType ? 'Trabalhador' : 'Passante'}
                                </span>
                                {cell && (
                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: cell.card_color }}>
                                        {cell.name}
                                    </span>
                                )}
                            </div>

                            {/* Payment Badge - Compact */}
                            {!isWorkerType && (
                                <div className={cn(
                                    "w-full rounded-lg px-3 py-2 flex items-center justify-between border mb-4",
                                    worker.payment_status === 'paid'
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        : "bg-amber-50 border-amber-100 text-amber-700"
                                )}>
                                    <span className="text-xs font-bold uppercase tracking-wide">Inscrição</span>
                                    <div className="text-right">
                                        <span className="block text-xs font-extrabold uppercase">
                                            {worker.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                                        </span>
                                        {worker.payment_amount && <span className="text-sm font-bold">R$ {worker.payment_amount}</span>}
                                    </div>
                                </div>
                            )}

                            {/* Personal Details List - Compact */}
                            <div className="w-full text-sm space-y-3">
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Telefone</span>
                                    <span className="font-medium text-slate-800">{worker.phone || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Idade</span>
                                    <span className="font-medium text-slate-800">
                                        {worker.birth_date ? `${differenceInYears(new Date(), new Date(worker.birth_date))} anos` : '-'}
                                    </span>
                                </div>

                                {/* Responsible / Family Contacts */}
                                {responsibleWorker && (
                                    <div className="flex justify-between py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Responsável</span>
                                        <span className="font-medium text-indigo-700 truncate max-w-[150px]" title={`${responsibleWorker.name} ${responsibleWorker.surname}`}>
                                            {responsibleWorker.name} {responsibleWorker.surname}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Restrictions Mini-Badges */}
                            {(worker.food_restrictions || worker.controlled_medication || worker.physical_restrictions) && (
                                <div className="w-full flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                                    {worker.food_restrictions && (
                                        <div className="flex-1 bg-red-50 text-red-700 px-2 py-1.5 rounded text-[10px] font-medium border border-red-100 leading-tight">
                                            <span className="block font-bold mb-0.5">Alimentar</span>
                                            {worker.food_restrictions}
                                        </div>
                                    )}
                                    {worker.controlled_medication && (
                                        <div className="flex-1 bg-amber-50 text-amber-700 px-2 py-1.5 rounded text-[10px] font-medium border border-amber-100 leading-tight">
                                            <span className="block font-bold mb-0.5">Remédio</span>
                                            {worker.controlled_medication}
                                        </div>
                                    )}
                                    {worker.physical_restrictions && (
                                        <div className="flex-1 bg-slate-50 text-slate-700 px-2 py-1.5 rounded text-[10px] font-medium border border-slate-200 leading-tight">
                                            <span className="block font-bold mb-0.5">Física</span>
                                            {worker.physical_restrictions}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>


                    {/* RIGHT COLUMN: ASSIGNMENTS (COMPACT LIST VIEW) */}
                    <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">

                        <div className="flex-1 space-y-6 lg:overflow-y-auto pr-1 custom-scrollbar">

                            {/* WORK SCALES */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <Briefcase className="w-3.5 h-3.5" /> Escalas de Trabalho
                                </h4>
                                {workScales?.length > 0 ? (
                                    <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                                        {workScales.map(scale => (
                                            <div key={scale.id} className="flex items-center justify-between px-3 py-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-extrabold text-slate-600 uppercase">
                                                            {scale.day === 'Friday' ? 'Sex' : scale.day === 'Saturday' ? 'Sáb' : 'Dom'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">Dia</span>
                                                    </div>
                                                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {scale.period === 'Breakfast' ? 'Café da Manhã' :
                                                                scale.period === 'Lunch' ? 'Almoço' :
                                                                    scale.period === 'Afternoon' ? 'Lanche' : 'Jantar'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                                    {scale.areas?.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        Nenhuma escala de trabalho atribuída.
                                    </p>
                                )}
                            </div>

                            {/* PRAYER CLOCK & FIXED TEAMS (SIDE BY SIDE ON DESKTOP if space allows, else stacked compact) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Prayer Clock */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <Clock className="w-3.5 h-3.5" /> Relógio de Oração
                                    </h4>
                                    {prayerSlots?.length > 0 ? (
                                        <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                                            {prayerSlots.map(slot => {
                                                const details = getPrayerSlotDetails(slot.id);
                                                return (
                                                    <div key={slot.id} className="flex items-center gap-3 px-3 py-2">
                                                        <Clock className="w-4 h-4 text-amber-500" />
                                                        <span className="text-sm font-semibold text-slate-700">
                                                            <span className="capitalize">{details?.day}</span> às {details?.time}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            Sem horário de oração.
                                        </p>
                                    )}
                                </div>

                                {/* Fixed Scales/Teams */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <Users className="w-3.5 h-3.5" /> Equipes / Liderança
                                    </h4>
                                    <div className="space-y-2">
                                        {/* Room Leadership */}
                                        {roomLeadership?.length > 0 && roomLeadership.map(room => (
                                            <div key={room.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                                                <Home className="w-4 h-4 text-emerald-600" />
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-xs font-bold text-emerald-800 uppercase">Líder de Quarto</span>
                                                    <span className="text-xs text-emerald-700">{room.number} - {room.name}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Fixed Teams */}
                                        {fixedScales?.length > 0 ? (
                                            fixedScales.map(scale => {
                                                const isLeader = scale.leader_ids?.includes(worker.id);
                                                return (
                                                    <div key={scale.id} className={cn(
                                                        "flex items-center justify-between px-3 py-2 rounded-lg border",
                                                        isLeader ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"
                                                    )}>
                                                        <span className="text-sm font-medium text-slate-700">{scale.name}</span>
                                                        {isLeader && <Crown className="w-3.5 h-3.5 text-purple-600" />}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            (!roomLeadership || roomLeadership.length === 0) && (
                                                <p className="text-sm text-slate-400 italic bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                    Nenhuma equipe fixa.
                                                </p>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Passers Responsibility (Only visible if applicable) */}
                            {isWorkerType && (allPassers?.filter(p => p.responsible_worker_id === worker.id).length > 0) && (
                                <div className="pt-2">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Passantes sob Cuidados ({allPassers.filter(p => p.responsible_worker_id === worker.id).length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {allPassers
                                            ?.filter(p => p.responsible_worker_id === worker.id)
                                            .map(passer => (
                                                <div key={passer.id} className="flex items-center gap-2 p-2 rounded bg-white border border-slate-200">
                                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {passer.photo_url ? <img src={passer.photo_url} className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-slate-400" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-slate-800 truncate">{passer.name}</p>
                                                        <p className={cn("text-[9px] font-bold uppercase", passer.payment_status === 'paid' ? "text-emerald-600" : "text-amber-600")}>
                                                            {passer.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="border-t border-slate-100 pt-4 mt-auto">
                            <button
                                onClick={onClose}
                                className="w-full rounded-lg bg-slate-900 text-white px-4 py-3 text-sm font-bold shadow hover:bg-slate-800 transition-colors"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Expanded Photo Modal */}
            {showExpandedPhoto && worker.photo_url && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-all"
                    onClick={() => setShowExpandedPhoto(false)}
                >
                    <div className="relative max-w-2xl w-full max-h-[90vh]">
                        <button
                            onClick={() => setShowExpandedPhoto(false)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={worker.photo_url}
                            alt={`${worker.name} ${worker.surname}`}
                            className="w-full h-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                        />
                        <div className="text-center mt-4">
                            <p className="text-white text-xl font-bold">{worker.name} {worker.surname}</p>
                            {cell && <p className="text-white/60 text-sm">{cell.name}</p>}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});
