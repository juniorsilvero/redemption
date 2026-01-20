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
            <Modal isOpen={isOpen} onClose={onClose} title="Perfil do Guerreiro" maxWidth="max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN: BASIC INFO & STATS */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Profile Header Card */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 z-0"></div>

                            <div
                                className={cn(
                                    "relative z-10 h-28 w-28 rounded-full border-4 border-white shadow-md flex items-center justify-center bg-slate-100 text-slate-400 overflow-hidden mb-4",
                                    worker.photo_url && "cursor-pointer group"
                                )}
                                onClick={() => worker.photo_url && setShowExpandedPhoto(true)}
                            >
                                {worker.photo_url ? (
                                    <>
                                        <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </>
                                ) : (
                                    <User className="h-12 w-12" />
                                )}
                            </div>

                            <h3 className="relative z-10 text-xl font-bold text-slate-900">{worker.name} {worker.surname}</h3>
                            <p className="relative z-10 text-sm text-slate-500 mb-4">{isWorkerType ? 'Trabalhador' : 'Passante'}</p>

                            <div className="relative z-10 flex flex-wrap justify-center gap-2 w-full">
                                {cell && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: cell.card_color }}>
                                        {cell.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Payment & Key Stats */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status Financeiro</span>
                            </div>
                            <div className="p-6 text-center">
                                <div className={cn(
                                    "inline-flex flex-col items-center justify-center px-6 py-3 rounded-2xl border-2 mb-2",
                                    worker.payment_status === 'paid'
                                        ? "bg-emerald-50 border-emerald-100"
                                        : "bg-amber-50 border-amber-100"
                                )}>
                                    <span className={cn(
                                        "text-xs font-bold uppercase tracking-widest mb-1",
                                        worker.payment_status === 'paid' ? "text-emerald-600" : "text-amber-600"
                                    )}>
                                        {worker.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                                    </span>
                                    {worker.payment_amount && (
                                        <span className={cn(
                                            "text-2xl font-black",
                                            worker.payment_status === 'paid' ? "text-emerald-700" : "text-amber-700"
                                        )}>
                                            R$ {worker.payment_amount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">Referente à inscrição/evento</p>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                            <div className="p-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">Dados Pessoais</div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-slate-500">Telefone</span>
                                    <span className="font-medium text-slate-900">{worker.phone || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-slate-500">Idade</span>
                                    <span className="font-medium text-slate-900">
                                        {worker.birth_date ? `${differenceInYears(new Date(), new Date(worker.birth_date))} anos` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-slate-500">Nascimento</span>
                                    <span className="font-medium text-slate-900">
                                        {worker.birth_date ? format(new Date(worker.birth_date), 'dd/MM/yyyy') : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Restrictions Badges */}
                        <div className="flex flex-wrap gap-2">
                            {worker.food_restrictions && (
                                <div className="w-full bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs border border-red-100 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block">Restrição Alimentar</span>
                                        {worker.food_restrictions}
                                    </div>
                                </div>
                            )}
                            {worker.controlled_medication && (
                                <div className="w-full bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-xs border border-amber-100 flex items-start gap-2">
                                    <Pill className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block">Medicamento Controlado</span>
                                        {worker.controlled_medication}
                                    </div>
                                </div>
                            )}
                            {worker.physical_restrictions && (
                                <div className="w-full bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs border border-slate-200 flex items-start gap-2">
                                    <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block">Restrição Física</span>
                                        {worker.physical_restrictions}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>


                    {/* RIGHT COLUMN: ASSIGNMENTS & SCALES */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Work Scales */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                    <Briefcase className="w-4 h-4 text-indigo-600" /> Escalas de Trabalho
                                </h4>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{workScales?.length || 0}</span>
                            </div>
                            <div className="p-6">
                                {workScales?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {workScales.map(scale => (
                                            <div key={scale.id} className="flex items-center justify-between p-3 rounded-lg bg-white border-l-4 border-indigo-500 shadow-sm ring-1 ring-slate-200">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase mb-0.5">
                                                        {scale.day === 'Friday' ? 'Sexta-feira' : scale.day === 'Saturday' ? 'Sábado' : 'Domingo'}
                                                    </p>
                                                    <p className="text-sm font-bold text-indigo-900">
                                                        {scale.period === 'Breakfast' ? 'Café da Manhã' :
                                                            scale.period === 'Lunch' ? 'Almoço' :
                                                                scale.period === 'Afternoon' ? 'Lanche' : 'Jantar'}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                                                    {scale.areas?.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic text-center py-2">Nenhuma escala de trabalho atribuída.</p>
                                )}
                            </div>
                        </div>

                        {/* Prayer Clock */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50/30">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900 uppercase tracking-wide">
                                    <Clock className="w-4 h-4 text-amber-600" /> Relógio de Oração
                                </h4>
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{prayerSlots?.length || 0}</span>
                            </div>
                            <div className="p-6">
                                {prayerSlots?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {prayerSlots.map(slot => {
                                            const details = getPrayerSlotDetails(slot.id);
                                            return (
                                                <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border-l-4 border-amber-500 shadow-sm ring-1 ring-slate-200">
                                                    <div className="bg-amber-50 p-2 rounded-lg">
                                                        <Clock className="w-5 h-5 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{details?.time}</p>
                                                        <p className="text-xs font-medium text-slate-500 uppercase">{details?.day}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic text-center py-2">Nenhum horário no relógio de oração.</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fixed Scales */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-50/30">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-purple-900 uppercase tracking-wide">
                                        <Users className="w-4 h-4 text-purple-600" /> Equipes Fixas
                                    </h4>
                                </div>
                                <div className="p-6">
                                    {fixedScales?.length > 0 ? (
                                        <div className="space-y-2">
                                            {fixedScales.map(scale => {
                                                const isLeader = scale.leader_ids?.includes(worker.id);
                                                return (
                                                    <div key={scale.id} className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg border",
                                                        isLeader ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"
                                                    )}>
                                                        <span className={cn("font-medium text-sm", isLeader ? "text-purple-900" : "text-slate-700")}>{scale.name}</span>
                                                        {isLeader && <span className="text-[10px] font-bold uppercase bg-white text-purple-700 px-2 py-0.5 rounded border border-purple-100">Líder</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">Nenhuma equipe fixa.</p>
                                    )}
                                </div>
                            </div>

                            {/* Room Leadership */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900 uppercase tracking-wide">
                                        <Home className="w-4 h-4 text-emerald-600" /> Liderança de Quarto
                                    </h4>
                                </div>
                                <div className="p-6">
                                    {roomLeadership?.length > 0 ? (
                                        <div className="space-y-2">
                                            {roomLeadership.map(room => (
                                                <div key={room.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                                    <Crown className="w-5 h-5 text-emerald-600" />
                                                    <div>
                                                        <p className="text-sm font-bold text-emerald-900">Quarto {room.number}</p>
                                                        <p className="text-xs text-emerald-700">{room.name}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">Não é líder de quarto.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Family Contacts & Responsibles */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Relacionamentos & Família</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {responsibleWorker && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Responsável (Discipulador)</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <span className="font-semibold text-slate-700">{responsibleWorker.name} {responsibleWorker.surname}</span>
                                        </div>
                                    </div>
                                )}

                                {(worker.family_contact_1 || worker.family_contact_2) && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 col-span-1 md:col-span-2">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">Contatos de Emergência</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {worker.family_contact_1 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                    <span className="text-sm text-slate-700 font-medium">{worker.family_contact_1}</span>
                                                </div>
                                            )}
                                            {worker.family_contact_2 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                    <span className="text-sm text-slate-700 font-medium">{worker.family_contact_2}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-slate-900 text-white px-6 py-2.5 text-sm font-medium shadow hover:bg-slate-800 transition-colors"
                    >
                        Fechar
                    </button>
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

