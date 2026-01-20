import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { User, X, ZoomIn, Calendar, Clock, Home, Briefcase, Crown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const WorkerInfoModal = React.memo(function WorkerInfoModal({ worker, cells, allWorkers, allPassers, isOpen, onClose }) {
    const [showExpandedPhoto, setShowExpandedPhoto] = useState(false);

    // Fetch Work Scales
    const { data: workScales } = useQuery({
        queryKey: ['worker_scales_info', worker?.id],
        queryFn: async () => {
            if (!worker?.id) return [];
            const { data } = await supabase
                .from('scales')
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


    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Detalhes">
                <div className="space-y-6">
                    {/* Header Profile */}
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0",
                                worker.photo_url && "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all group relative"
                            )}
                            onClick={() => worker.photo_url && setShowExpandedPhoto(true)}
                        >
                            {worker.photo_url ? (
                                <>
                                    <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </>
                            ) : (
                                <User className="h-8 w-8" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 leading-tight">{worker.name} {worker.surname}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                    {isWorkerType ? 'Trabalhador' : 'Passante'}
                                </span>
                                {cell && (
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/10" style={{ backgroundColor: `${cell.card_color}20` }}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cell.card_color }}></div>
                                        {cell.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Telefone</p>
                            <p className="text-sm font-medium text-slate-900">{worker.phone || 'Sem telefone'}</p>
                        </div>
                        {!isWorkerType && (
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Pagamento</p>
                                <span className={cn(
                                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset",
                                    worker.payment_status === 'paid'
                                        ? "bg-green-50 text-green-700 ring-green-600/20"
                                        : "bg-amber-50 text-amber-700 ring-amber-600/20"
                                )}>
                                    {worker.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                    {worker.payment_amount ? ` - R$ ${worker.payment_amount}` : ''}
                                </span>
                            </div>
                        )}
                        {(worker.birth_date) && (
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Nascimento</p>
                                <p className="text-sm text-slate-900">
                                    {format(new Date(worker.birth_date), 'dd/MM/yyyy')}
                                    <span className="text-slate-500 ml-1">
                                        ({differenceInYears(new Date(), new Date(worker.birth_date))} anos)
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Family Contacts (Passers) */}
                    {!isWorkerType && (worker.family_contact_1 || worker.family_contact_2) && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            {worker.family_contact_1 && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contato Familiar 1</p>
                                    <p className="text-sm font-medium text-slate-900">{worker.family_contact_1}</p>
                                </div>
                            )}
                            {worker.family_contact_2 && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contato Familiar 2</p>
                                    <p className="text-sm font-medium text-slate-900">{worker.family_contact_2}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SCALES & RESPONSIBILITIES SECTION */}
                    <div className="space-y-4">

                        {/* Work Scales */}
                        {workScales?.length > 0 ? (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wide">
                                    <Briefcase className="w-4 h-4" /> Escalas de Trabalho
                                </h4>
                                <div className="space-y-2">
                                    {workScales.map(scale => (
                                        <div key={scale.id} className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                                <Calendar className="w-4 h-4 text-indigo-400" />
                                                <span className="capitalize">{scale.day === 'Friday' ? 'Sexta' : scale.day === 'Saturday' ? 'Sábado' : 'Domingo'}</span>
                                                <span className="text-indigo-300">•</span>
                                                <span className="capitalize text-slate-600">
                                                    {scale.period === 'Breakfast' ? 'Café' :
                                                        scale.period === 'Lunch' ? 'Almoço' :
                                                            scale.period === 'Afternoon' ? 'Lanche' : 'Jantar'}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-700 bg-white px-2 py-0.5 rounded shadow-sm border border-indigo-100">
                                                {scale.areas?.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide">
                                    <Briefcase className="w-4 h-4" /> Escalas de Trabalho
                                </h4>
                                <p className="text-sm text-slate-400 italic pl-6">Não está escalado.</p>
                            </div>
                        )}

                        {/* Fixed Scales */}
                        {fixedScales?.length > 0 ? (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-purple-600 mb-2 uppercase tracking-wide">
                                    <Users className="w-4 h-4" /> Escalas Fixas
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {fixedScales.map(scale => {
                                        const isLeader = scale.leader_ids?.includes(worker.id);
                                        return (
                                            <span key={scale.id} className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border shadow-sm",
                                                isLeader
                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                            )}>
                                                {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                                                {scale.name}
                                                {isLeader && <span className="text-[10px] uppercase font-bold text-amber-600 ml-1 bg-amber-100 px-1 rounded">Líder</span>}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide">
                                    <Users className="w-4 h-4" /> Escalas Fixas
                                </h4>
                                <p className="text-sm text-slate-400 italic pl-6">Não está em escalas fixas.</p>
                            </div>
                        )}

                        {/* Prayer Clock */}
                        {prayerSlots?.length > 0 ? (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-amber-600 mb-2 uppercase tracking-wide">
                                    <Clock className="w-4 h-4" /> Relógio de Oração
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {prayerSlots.map(slot => (
                                        <div key={slot.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-sm">
                                            <span className="font-medium text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-100 shadow-sm">{slot.time}</span>
                                            <span className="text-slate-600 capitalize">{slot.day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide">
                                    <Clock className="w-4 h-4" /> Relógio de Oração
                                </h4>
                                <p className="text-sm text-slate-400 italic pl-6">Não escalado para oração.</p>
                            </div>
                        )}

                        {/* Room Leadership */}
                        {roomLeadership?.length > 0 ? (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-600 mb-2 uppercase tracking-wide">
                                    <Home className="w-4 h-4" /> Líder de Quarto
                                </h4>
                                {roomLeadership.map(room => (
                                    <div key={room.id} className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                        <Crown className="w-4 h-4 text-emerald-500" />
                                        <span className="font-medium text-emerald-800 text-sm">Quarto {room.number} - {room.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide">
                                    <Home className="w-4 h-4" /> Líder de Quarto
                                </h4>
                                <p className="text-sm text-slate-400 italic pl-6">Não é líder de quarto.</p>
                            </div>
                        )}

                    </div>

                    {/* Additional Details (Address, Restrictions) - Collapsible or Bottom */}
                    <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Outras Informações</p>

                        {(worker.address) && (
                            <div className="text-xs text-slate-600">
                                <span className="font-bold text-slate-700">Endereço:</span> {worker.address}
                            </div>
                        )}
                        {(worker.food_restrictions) && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                <span className="font-bold">Restrição Alimentar:</span> {worker.food_restrictions}
                            </div>
                        )}
                        {(worker.controlled_medication) && (
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                <span className="font-bold">Medicamento:</span> {worker.controlled_medication}
                            </div>
                        )}
                        {(worker.physical_restrictions) && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="font-bold">Restrição Física:</span> {worker.physical_restrictions}
                            </div>
                        )}
                    </div>


                    {/* Keep Passers / Responsible section if needed, but it was getting long. Let's keep distinct sections */}

                    {/* Responsible Display (for Passers) */}
                    {!isWorkerType && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Responsável</p>
                            <div className="flex items-center gap-2 text-indigo-600">
                                {responsibleWorker ? (
                                    <>
                                        <User className="h-3 w-3" />
                                        <p className="text-sm font-medium">
                                            {responsibleWorker.name} {responsibleWorker.surname}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Nenhum responsável vinculado</p>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Passers Display (for Workers) */}
                    {isWorkerType && (allPassers?.filter(p => p.responsible_worker_id === worker.id).length > 0) && (
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                                Passantes (Responsabilidade)
                            </h4>
                            <div className="space-y-1">
                                {allPassers
                                    ?.filter(p => p.responsible_worker_id === worker.id)
                                    .map(passer => (
                                        <div key={passer.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] overflow-hidden shrink-0">
                                                    {passer.photo_url ? (
                                                        <img src={passer.photo_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700">{passer.name} {passer.surname}</span>
                                            </div>
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ring-1 ring-inset",
                                                passer.payment_status === 'paid'
                                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                                    : "bg-orange-50 text-orange-700 ring-orange-600/20"
                                            )}>
                                                {passer.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={onClose}
                            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Expanded Photo Modal */}
            {showExpandedPhoto && worker.photo_url && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setShowExpandedPhoto(false)}
                >
                    <div className="relative max-w-lg w-full max-h-[80vh]">
                        <button
                            onClick={() => setShowExpandedPhoto(false)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={worker.photo_url}
                            alt={`${worker.name} ${worker.surname}`}
                            className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                        <p className="text-center text-white mt-4 text-lg font-medium">
                            {worker.name} {worker.surname}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
});

