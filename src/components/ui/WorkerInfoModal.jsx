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

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
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
