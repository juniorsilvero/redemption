import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Search, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export function WorkerSelectorModal({ isOpen, onClose, workers, onSelect, title = "Selecionar Trabalhador" }) {
    const [search, setSearch] = useState('');

    const filteredWorkers = workers?.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.surname.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-4 shadow-xl w-full h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
                        <button onClick={onClose}><X className="h-5 w-5 text-gray-500" /></button>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar nome..."
                            className="w-full pl-8 pr-4 py-2 border rounded-md text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
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
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
