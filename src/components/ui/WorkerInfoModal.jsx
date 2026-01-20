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
                    service_areas (name)
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-md" hideHeader={true} hideCloseButton={true} noPadding={true}>
            {/* Custom Header with Blue Gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 pt-6 pb-6 text-center relative rounded-t-lg">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>

                <div
                    className={cn(
                        "mx-auto h-20 w-20 rounded-full border-4 border-white/30 shadow-lg flex items-center justify-center bg-slate-100 text-slate-400 overflow-hidden mb-2",
                        worker.photo_url && "cursor-pointer hover:ring-2 hover:ring-white hover:ring-offset-2 hover:ring-offset-blue-500 transition-all"
                    )}
                    onClick={() => worker.photo_url && setShowExpandedPhoto(true)}
                >
                    {worker.photo_url ? (
                        <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <User className="h-8 w-8" />
                    )}
                </div>

                <h3 className="text-lg font-bold text-white mb-0.5">{worker.name} {worker.surname}</h3>

                <div className="flex items-center justify-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white backdrop-blur-sm">
                        {isWorkerType ? 'Trabalhador' : 'Passante'}
                    </span>
                    {cell && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: cell.card_color }}>
                            {cell.name}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-4">

                {/* Info Row: Phone & Payment */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Telefone</p>
                        <p className="text-sm font-semibold text-slate-800">{worker.phone || '-'}</p>
                    </div>

                    {(worker.payment_status || worker.payment_amount) && (
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pagamento</p>
                            <div className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1",
                                worker.payment_status === 'paid'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-orange-50 text-orange-700 border-orange-100"
                            )}>
                                <span>{worker.payment_status === 'paid' ? 'Pago' : 'Pendente'}</span>
                                {worker.payment_amount && <span>- R$ {worker.payment_amount}</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Assignments List */}
                <div className="space-y-3">

                    {/* Work Scales */}
                    <div>
                        <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <Briefcase className="w-3 h-3 text-indigo-500" /> Escalas de Trabalho
                        </h4>
                        {workScales?.length > 0 ? (
                            <div className="space-y-1.5">
                                {workScales.map(scale => (
                                    <div key={scale.id} className="bg-indigo-50/50 rounded-md p-2 flex items-center gap-2 border border-indigo-100/50">
                                        <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                                            <span className="capitalize">{scale.day === 'Friday' ? 'Sexta' : scale.day === 'Saturday' ? 'Sábado' : 'Domingo'}</span>
                                            <span className="w-0.5 h-0.5 rounded-full bg-indigo-300"></span>
                                            <span>
                                                {scale.period === 'Breakfast' ? 'Café' :
                                                    scale.period === 'Lunch' ? 'Almoço' :
                                                        scale.period === 'Afternoon' ? 'Lanche' : 'Jantar'}
                                            </span>
                                        </div>
                                        <span className="h-px flex-1 bg-indigo-200/50"></span>
                                        <span className="text-xs font-bold text-indigo-700">{scale.service_areas?.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic pl-1">Não escala de trabalho atribuída.</p>
                        )}
                    </div>

                    {/* Fixed Scales */}
                    {fixedScales?.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                <Users className="w-3 h-3 text-purple-500" /> Escalas Fixas
                            </h4>
                            <div className="space-y-1.5">
                                {fixedScales.map(scale => (
                                    <div key={scale.id} className="bg-purple-50/50 rounded-md p-2 border border-purple-100/50 flex justify-between items-center">
                                        <span className="text-xs font-semibold text-purple-900">{scale.name}</span>
                                        {scale.leader_ids?.includes(worker.id) && (
                                            <span className="text-[9px] font-bold uppercase bg-white text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">Líder</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prayer Clock */}
                    {prayerSlots?.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                <Clock className="w-3 h-3 text-amber-500" /> Relógio de Oração
                            </h4>
                            <div className="space-y-1.5">
                                {prayerSlots.map(slot => {
                                    const details = getPrayerSlotDetails(slot.id);
                                    return (
                                        <div key={slot.id} className="flex items-center gap-2 p-2 text-xs bg-amber-50/50 rounded-md border border-amber-100/50">
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            <span className="font-semibold text-slate-700">
                                                {details?.day} às {details?.time}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Room Leadership */}
                    {roomLeadership?.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                <Home className="w-3 h-3 text-emerald-500" /> Líder de Quarto
                            </h4>
                            <div className="space-y-1.5">
                                {roomLeadership.map(room => (
                                    <div key={room.id} className="bg-emerald-50/50 rounded-md p-2 border border-emerald-100/50 flex justify-between items-center">
                                        <span className="text-xs font-bold text-emerald-900">{room.name}</span>
                                        <span className="text-[10px] font-medium text-emerald-700 uppercase bg-white/50 px-1 rounded">Quarto {room.number}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Restrictions (if any) */}
                    {(worker.food_restrictions || worker.controlled_medication || worker.physical_restrictions) && (
                        <div className="pt-2 border-t border-slate-100">
                            <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">
                                <AlertCircle className="w-3 h-3 text-red-500" /> Observações
                            </h4>
                            <div className="space-y-1">
                                {worker.food_restrictions && (
                                    <div className="text-xs bg-red-50 p-2 rounded border border-red-100">
                                        <span className="font-bold text-red-700 block text-[10px] uppercase">Restrição Alimentar</span>
                                        <span className="text-slate-700">{worker.food_restrictions}</span>
                                    </div>
                                )}
                                {worker.controlled_medication && (
                                    <div className="text-xs bg-amber-50 p-2 rounded border border-amber-100">
                                        <span className="font-bold text-amber-700 block text-[10px] uppercase">Medicamento</span>
                                        <span className="text-slate-700">{worker.controlled_medication}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                <div className="sticky bottom-0 bg-white pt-2">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-slate-900 text-white px-4 py-3 text-sm font-bold shadow hover:bg-slate-800 transition-colors"
                    >
                        Fechar
                    </button>
                </div>


            </div>

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
                    </div>
                </div>
            )}
        </Modal>
    );
});
