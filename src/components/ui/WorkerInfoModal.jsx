import { Modal } from './Modal';
import { User } from 'lucide-react';

export function WorkerInfoModal({ worker, cells, isOpen, onClose }) {
    if (!worker) return null;

    const cell = cells?.find(c => c.id === worker.cell_id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes">
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                        {worker.photo_url ? (
                            <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-8 w-8" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{worker.name} {worker.surname}</h3>
                        <p className="text-sm text-slate-500">{worker.phone || 'Sem telefone'}</p>
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

                    {worker.full_name && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Nome Completo</p>
                            <p className="text-sm text-slate-900">{worker.full_name}</p>
                        </div>
                    )}

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
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Saúde / Restrições</p>
                            {worker.food_restrictions && (
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold">Restrição Alimentar</p>
                                    <p className="text-sm text-slate-900">{worker.food_restrictions}</p>
                                </div>
                            )}
                            {worker.controlled_medication && (
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold">Medicamento Controlado</p>
                                    <p className="text-sm text-slate-900">{worker.controlled_medication}</p>
                                </div>
                            )}
                            {worker.physical_restrictions && (
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold">Restrição Física</p>
                                    <p className="text-sm text-slate-900">{worker.physical_restrictions}</p>
                                </div>
                            )}
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
