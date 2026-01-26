import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export function WorkerSearchSelect({ workers, onSelect, placeholder = "Buscar trabalhador...", excludeIds = [], className = "" }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Close logic when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const filteredWorkers = useMemo(() => {
        if (!workers) return [];

        let filtered = workers.filter(w => !excludeIds.includes(w.id));

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(w =>
                w.name?.toLowerCase().includes(term) ||
                w.surname?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [workers, searchTerm, excludeIds]);

    const handleSelect = (worker) => {
        onSelect(worker.id);
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="block w-full pl-10 pr-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-slate-900 placeholder:text-slate-500"
                />
                {searchTerm && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setIsOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && filteredWorkers.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredWorkers.map(worker => (
                        <button
                            key={worker.id}
                            onClick={() => handleSelect(worker)}
                            className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors text-sm"
                        >
                            <span className="font-medium text-slate-900">{worker.name} {worker.surname}</span>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && searchTerm && filteredWorkers.length === 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-4 py-3">
                    <p className="text-sm text-slate-400 italic">Nenhum trabalhador encontrado</p>
                </div>
            )}
        </div>
    );
}
