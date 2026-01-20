import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, X, User, Users, Calendar, Clock, Home, Briefcase, AlertCircle, ChevronRight, ZoomIn } from 'lucide-react';
import { cn } from '../../lib/utils';

export function GlobalSearch() {
    const { churchId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showExpandedPhoto, setShowExpandedPhoto] = useState(false);
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

    // Fetch all cells for mapping
    const { data: allCells } = useQuery({
        queryKey: ['search_cells', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch work scales
    const { data: workScales } = useQuery({
        queryKey: ['search_work_scales', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('work_scale').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch fixed scales
    const { data: fixedScales } = useQuery({
        queryKey: ['search_fixed_scales', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('fixed_scales').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch prayer clock
    const { data: prayerClock } = useQuery({
        queryKey: ['search_prayer_clock', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('prayer_clock').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch rooms
    const { data: rooms } = useQuery({
        queryKey: ['search_rooms', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('rooms').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch service areas
    const { data: serviceAreas } = useQuery({
        queryKey: ['search_service_areas', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('service_areas').select('*').eq('church_id', churchId);
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

    // Create service areas map
    const areasMap = useMemo(() => {
        return (serviceAreas || []).reduce((acc, area) => {
            acc[area.id] = area;
            return acc;
        }, {});
    }, [serviceAreas]);

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

    // Get worker additional info
    const getWorkerInfo = (workerId) => {
        const info = {
            workScaleAssignments: [],
            fixedScaleAssignments: [],
            prayerAssignments: [],
            roomLeader: null
        };

        // Find work scale assignments
        (workScales || []).forEach(scale => {
            if (scale.worker_id === workerId) {
                info.workScaleAssignments.push({
                    day: scale.day,
                    period: scale.period,
                    area: areasMap[scale.area_id]?.name || 'Área desconhecida'
                });
            }
        });

        // Find fixed scale assignments
        (fixedScales || []).forEach(scale => {
            const workerIds = scale.worker_ids || [];
            if (workerIds.includes(workerId)) {
                info.fixedScaleAssignments.push({
                    name: scale.name
                });
            }
        });

        // Find prayer clock assignments
        (prayerClock || []).forEach(prayer => {
            if (prayer.worker_id === workerId) {
                info.prayerAssignments.push({
                    slot: prayer.slot_id,
                    day: prayer.day,
                    time: prayer.time
                });
            }
        });

        // Check if room leader
        (rooms || []).forEach(room => {
            const leaderIds = room.leader_ids || [];
            if (leaderIds.includes(workerId)) {
                info.roomLeader = room;
            }
        });

        return info;
    };

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

    const dayTranslation = {
        'Friday': 'Sexta',
        'Saturday': 'Sábado',
        'Sunday': 'Domingo'
    };

    const periodTranslation = {
        'Breakfast': 'Café da Manhã',
        'Lunch': 'Almoço',
        'Afternoon': 'Tarde',
        'Dinner': 'Jantar'
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

            {/* Person Detail Modal */}
            {selectedPerson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className={cn(
                            "px-6 py-6 text-center relative",
                            selectedPerson.type === 'worker' ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-green-500 to-emerald-600"
                        )}>
                            <button
                                onClick={() => setSelectedPerson(null)}
                                className="absolute top-4 right-4 text-white/80 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div
                                className={cn(
                                    "w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 overflow-hidden",
                                    selectedPerson.photo_url && "cursor-pointer hover:ring-4 hover:ring-white/50 transition-all group relative"
                                )}
                                onClick={() => selectedPerson.photo_url && setShowExpandedPhoto(true)}
                            >
                                {selectedPerson.photo_url ? (
                                    <>
                                        <img src={selectedPerson.photo_url} alt="" className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </>
                                ) : (
                                    <User className="h-10 w-10 text-white" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {selectedPerson.name} {selectedPerson.surname}
                            </h3>
                            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                                {selectedPerson.typeLabel}
                                {selectedPerson.cell && (
                                    <>
                                        <span className="mx-1">•</span>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedPerson.cell.card_color }}></span>
                                        {selectedPerson.cell.name}
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Telefone</p>
                                    <p className="text-sm text-slate-900">{selectedPerson.phone || 'Não informado'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Pagamento</p>
                                    <span className={cn(
                                        "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                                        selectedPerson.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                    )}>
                                        {selectedPerson.payment_status === 'paid' ? 'Pago' : 'Pendente'} - R$ {selectedPerson.payment_amount?.toFixed(2) || '0.00'}
                                    </span>
                                </div>
                            </div>

                            {/* Worker Specific Info */}
                            {selectedPerson.type === 'worker' && (() => {
                                const workerInfo = getWorkerInfo(selectedPerson.id);

                                return (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        {/* Work Scale Assignments */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Briefcase className="h-4 w-4 text-indigo-500" />
                                                <p className="text-xs text-slate-500 uppercase font-semibold">Escalas de Trabalho</p>
                                            </div>
                                            {workerInfo.workScaleAssignments.length > 0 ? (
                                                <div className="space-y-1">
                                                    {workerInfo.workScaleAssignments.map((scale, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-sm">
                                                            <Calendar className="h-3 w-3 text-indigo-500" />
                                                            <span className="font-medium text-indigo-900">
                                                                {dayTranslation[scale.day] || scale.day}
                                                            </span>
                                                            <span className="text-indigo-600">•</span>
                                                            <span className="text-indigo-700">{periodTranslation[scale.period] || scale.period}</span>
                                                            <span className="text-indigo-600">-</span>
                                                            <span className="text-indigo-800 font-semibold">{scale.area}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">Não escalado para trabalho.</p>
                                            )}
                                        </div>

                                        {/* Fixed Scale Assignments */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users className="h-4 w-4 text-purple-500" />
                                                <p className="text-xs text-slate-500 uppercase font-semibold">Escalas Fixas</p>
                                            </div>
                                            {workerInfo.fixedScaleAssignments.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {workerInfo.fixedScaleAssignments.map((scale, idx) => (
                                                        <span key={idx} className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                                            {scale.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">Não está em escalas fixas.</p>
                                            )}
                                        </div>

                                        {/* Prayer Clock */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="h-4 w-4 text-amber-500" />
                                                <p className="text-xs text-slate-500 uppercase font-semibold">Relógio de Oração</p>
                                            </div>
                                            {workerInfo.prayerAssignments.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {workerInfo.prayerAssignments.map((prayer, idx) => (
                                                        <span key={idx} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                                                            {prayer.day} - {prayer.time}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">Não escalado para oração.</p>
                                            )}
                                        </div>

                                        {/* Room Leader */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Home className="h-4 w-4 text-teal-500" />
                                                <p className="text-xs text-slate-500 uppercase font-semibold">Líder de Quarto</p>
                                            </div>
                                            {workerInfo.roomLeader ? (
                                                <div className="p-3 bg-teal-50 rounded-lg">
                                                    <p className="text-sm font-semibold text-teal-900">
                                                        Quarto: {workerInfo.roomLeader.name}
                                                    </p>
                                                    {workerInfo.roomLeader.location && (
                                                        <p className="text-xs text-teal-600 mt-1">
                                                            Local: {workerInfo.roomLeader.location}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">Não é líder de quarto.</p>
                                            )}
                                        </div>

                                        {/* Is Room Leader Info (from worker record) */}
                                        {selectedPerson.is_room_leader && (
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-blue-500" />
                                                <p className="text-sm text-blue-800 font-medium">Este trabalhador é marcado como Líder de Quarto</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Passer Specific Info */}
                            {selectedPerson.type === 'passer' && (
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    {selectedPerson.birth_date && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Data de Nascimento</p>
                                                <p className="text-sm text-slate-900">{new Date(selectedPerson.birth_date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            {selectedPerson.age && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Idade</p>
                                                    <p className="text-sm text-slate-900">{selectedPerson.age} anos</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedPerson.address && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Endereço</p>
                                            <p className="text-sm text-slate-900">{selectedPerson.address}</p>
                                        </div>
                                    )}

                                    {(selectedPerson.family_contact_1 || selectedPerson.family_contact_2) && (
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedPerson.family_contact_1 && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contato Familiar 1</p>
                                                    <p className="text-sm text-slate-900">{selectedPerson.family_contact_1}</p>
                                                </div>
                                            )}
                                            {selectedPerson.family_contact_2 && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contato Familiar 2</p>
                                                    <p className="text-sm text-slate-900">{selectedPerson.family_contact_2}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedPerson.food_restrictions && (
                                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-xs text-yellow-700 uppercase font-semibold mb-1">Restrição Alimentar</p>
                                            <p className="text-sm text-yellow-900">{selectedPerson.food_restrictions}</p>
                                        </div>
                                    )}

                                    {selectedPerson.controlled_medication && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-xs text-red-700 uppercase font-semibold mb-1">Medicamento Controlado</p>
                                            <p className="text-sm text-red-900">{selectedPerson.controlled_medication}</p>
                                        </div>
                                    )}

                                    {selectedPerson.physical_restrictions && (
                                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                            <p className="text-xs text-orange-700 uppercase font-semibold mb-1">Restrição Física</p>
                                            <p className="text-sm text-orange-900">{selectedPerson.physical_restrictions}</p>
                                        </div>
                                    )}

                                    {selectedPerson.responsible_worker_id && (
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Trabalhador Responsável</p>
                                            <p className="text-sm text-slate-900">
                                                {(() => {
                                                    const worker = (allWorkers || []).find(w => w.id === selectedPerson.responsible_worker_id);
                                                    return worker ? `${worker.name} ${worker.surname}` : 'Não encontrado';
                                                })()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Close Button */}
                            <div className="pt-4">
                                <button
                                    onClick={() => setSelectedPerson(null)}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Photo Modal */}
            {showExpandedPhoto && selectedPerson?.photo_url && (
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
                            src={selectedPerson.photo_url}
                            alt={`${selectedPerson.name} ${selectedPerson.surname}`}
                            className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                        <p className="text-center text-white mt-4 text-lg font-medium">
                            {selectedPerson.name} {selectedPerson.surname}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
