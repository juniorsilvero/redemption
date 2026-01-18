import { useState } from 'react';
import { Search, User } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../../lib/utils';

export function WorkerSelectorModal({ isOpen, onClose, workers, onSelect, title = "Selecionar Trabalhador" }) {
    const [search, setSearch] = useState('');

    const filteredWorkers = workers?.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.surname.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md h-[500px] flex flex-col p-0 overflow-hidden">
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar nome..."
                        className="w-full pl-8 pr-4 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredWorkers?.map(worker => (
                    <button
                        key={worker.id}
                        onClick={() => { onSelect(worker); onClose(); setSearch('') }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors text-left"
                    >
                        {worker.photo_url ? (
                            <img src={worker.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-500" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-slate-900">{worker.name} {worker.surname}</p>
                            <p className="text-xs text-slate-500">{worker.cell_name || 'Sem Célula'}</p>
                        </div>
                    </button>
                ))}
                {filteredWorkers?.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">Nenhum trabalhador encontrado.</p>
                )}
            </div>
        </Modal>
    );
}
