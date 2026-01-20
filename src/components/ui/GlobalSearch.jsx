import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, X, User, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WorkerInfoModal } from './WorkerInfoModal';

export function GlobalSearch() {
    const { churchId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Fetch all workers (both genders)
    const { data: allWorkers } = useQuery({
        queryKey: ['search_workers', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('workers').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch all passers (both genders)
    const { data: allPassers } = useQuery({
        queryKey: ['search_passers', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('passers').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch all cells for mapping and modal
    const { data: allCells } = useQuery({
        queryKey: ['search_cells', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Create cell map
    const cellMap = useMemo(() => {
        return (allCells || []).reduce((acc, cell) => {
            acc[cell.id] = cell;
            return acc;
        }, {});
    }, [allCells]);

    // Search results
    const searchResults = useMemo(() => {
        if (!searchTerm.trim() || searchTerm.length < 2) return [];

        const term = searchTerm.toLowerCase().trim();
        const results = [];

        // Search workers
        (allWorkers || []).forEach(worker => {
            const fullName = `${worker.name} ${worker.surname}`.toLowerCase();
            if (fullName.includes(term)) {
                results.push({
                    ...worker,
                    type: 'worker',
                    typeLabel: 'Trabalhador',
                    cell: cellMap[worker.cell_id]
                });
            }
        });

        // Search passers
        (allPassers || []).forEach(passer => {
            const fullName = `${passer.name} ${passer.surname}`.toLowerCase();
            if (fullName.includes(term)) {
                results.push({
                    ...passer,
                    type: 'passer',
                    typeLabel: 'Passante',
                    cell: cellMap[passer.cell_id]
                });
            }
        });

        return results.slice(0, 10); // Limit to 10 results
    }, [searchTerm, allWorkers, allPassers, cellMap]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectPerson = (person) => {
        setSelectedPerson(person);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <>
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Buscar trabalhador ou passante..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
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

                {/* Dropdown Results */}
                {isOpen && searchTerm.length >= 2 && (
                    <div
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                    >
                        {searchResults.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                Nenhum resultado encontrado.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {searchResults.map((person) => (
                                    <button
                                        key={`${person.type}-${person.id}`}
                                        onClick={() => handleSelectPerson(person)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {person.photo_url ? (
                                                <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">
                                                {person.name} {person.surname}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                                    person.type === 'worker' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                                )}>
                                                    {person.typeLabel}
                                                </span>
                                                {person.cell && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: person.cell.card_color }}></span>
                                                        {person.cell.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-300" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Worker Info Modal */}
            {selectedPerson && (
                <WorkerInfoModal
                    isOpen={!!selectedPerson}
                    onClose={() => setSelectedPerson(null)}
                    worker={selectedPerson}
                    cells={allCells}
                    allWorkers={allWorkers}
                    allPassers={allPassers}
                />
            )}
        </>
    );
}
