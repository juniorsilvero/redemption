import { Modal } from './Modal';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';


export function WorkerInfoModal({ worker, cells, allWorkers, allPassers, isOpen, onClose }) {

    if (!worker) return null;

    const cell = cells?.find(c => c.id === worker.cell_id);
    const isPasser = !!worker.responsible_worker_id || !worker.is_room_leader; // Simple check, but we can be more robust if needed.
    // Actually, in the DB, workers don't have responsible_worker_id. Passers do.
    const isWorkerType = 'is_room_leader' in worker;

    // Find the responsible worker if this is a passer
    const responsibleWorker = !isWorkerType && worker.responsible_worker_id
        ? allWorkers?.find(w => w.id === worker.responsible_worker_id)
        : null;


    return (

        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes">
            <div className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                        {worker.photo_url ? (
                            <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-8 w-8" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">{worker.name} {worker.surname}</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">{worker.phone || 'Sem telefone'}</p>
                    </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Célula</p>
                        <div className="flex items-center gap-2">
                            {cell ? (
                                <>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cell.card_color }}></div>
                                    <p className="text-sm font-medium text-slate-900">{cell.name}</p>
                                </>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Sem célula vinculada</p>
                            )}
                        </div>
                    </div>

                    {(worker.birth_date || worker.age) && (
                        <div className="grid grid-cols-2 gap-4">
                            {worker.birth_date && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Nascimento</p>
                                    <p className="text-sm text-slate-900">{new Date(worker.birth_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            )}
                            {worker.age && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Idade</p>
                                    <p className="text-sm text-slate-900">{worker.age} anos</p>
                                </div>
                            )}
                        </div>
                    )}

                    {worker.address && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Endereço</p>
                            <p className="text-sm text-slate-900">{worker.address}</p>
                        </div>
                    )}

                    {(worker.family_contact_1 || worker.family_contact_2) && (
                        <div className="grid grid-cols-1 gap-2">
                            {worker.family_contact_1 && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contato Familiar 1</p>
                                    <p className="text-sm text-slate-900">{worker.family_contact_1}</p>
                                </div>
                            )}
                            {worker.family_contact_2 && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contato Familiar 2</p>
                                    <p className="text-sm text-slate-900">{worker.family_contact_2}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {(worker.food_restrictions || worker.controlled_medication || worker.physical_restrictions) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {worker.food_restrictions && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Restrição Alimentar</p>
                                    <p className="text-sm text-slate-900">{worker.food_restrictions}</p>
                                </div>
                            )}
                            {worker.controlled_medication && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Medicamento Controlado</p>
                                    <p className="text-sm text-slate-900">{worker.controlled_medication}</p>
                                </div>
                            )}
                            {worker.physical_restrictions && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Restrição Física</p>
                                    <p className="text-sm text-slate-900">{worker.physical_restrictions}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Relationship Display */}
                    {!isWorkerType && worker.responsible_worker_id && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Responsável</p>
                            <div className="flex items-center gap-2 text-indigo-600">
                                <User className="h-3 w-3" />
                                <p className="text-sm font-medium">
                                    {allWorkers?.find(w => w.id === worker.responsible_worker_id)?.name || 'Carregando...'}
                                    {' '}
                                    {allWorkers?.find(w => w.id === worker.responsible_worker_id)?.surname || ''}
                                </p>

                            </div>
                        </div>
                    )}

                    {isWorkerType && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Passantes (Responsabilidade)</p>
                            <div className="space-y-1">
                                {allPassers
                                    ?.filter(p => p.responsible_worker_id === worker.id)
                                    .map(passer => (
                                        <div key={passer.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:bg-slate-50">
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
                                {allPassers?.filter(p => p.responsible_worker_id === worker.id).length === 0 && (
                                    <p className="text-xs text-slate-400 italic py-1">Nenhum passante vinculado</p>
                                )}

                            </div>
                        </div>
                    )}
                </div>


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
    );
}
