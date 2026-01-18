// Strict Gender Separation Enforced: Male and Female scales are now completely independent.
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';

import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { AlertTriangle, Save, Plus, Trash2, Users, Info, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { generateScalePDF, generateFixedScalePDF } from '../utils/pdfGenerator';

import { Modal } from '../components/ui/Modal';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';

export default function Scale() {
    const { churchId } = useAuth();
    const { genderFilter, setGenderFilter } = useFilter();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'fixed'
    const [activeTab, setActiveTab] = useState('Friday'); // Friday, Saturday, Sunday

    // Enforce Gender Filter (No 'All' allowed)
    useEffect(() => {
        if (genderFilter === 'all') {
            setGenderFilter('male');
        }
    }, [genderFilter, setGenderFilter]);

    // Fixed Scales State
    const [isFixedScaleModalOpen, setIsFixedScaleModalOpen] = useState(false);
    const [newFixedScaleName, setNewFixedScaleName] = useState('');
    const [viewingWorker, setViewingWorker] = useState(null);

    const days = ['Friday', 'Saturday', 'Sunday'];

    // Filter periods based on day
    let periods = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'];

    if (activeTab === 'Friday') {
        periods = ['Dinner'];
    } else if (activeTab === 'Sunday') {
        periods = ['Breakfast', 'Lunch'];
    }

    // Fetch Data
    const { data: scales } = useQuery({
        queryKey: ['work_scale', churchId, genderFilter],
        queryFn: async () => {
            // Fetch all assignments for the church. Filtering happens on render to show "Occupied"
            const { data } = await supabase.from('work_scale').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    const { data: areas } = useQuery({
        queryKey: ['service_areas', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('service_areas').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch ALL Workers (to handle "Occupied" display correctly)
    const { data: workers } = useQuery({
        queryKey: ['workers', churchId], // removed genderFilter dependency
        queryFn: async () => {
            const { data } = await supabase.from('workers').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    const { data: fixedScales } = useQuery({
        queryKey: ['fixed_scales', churchId, genderFilter],
        queryFn: async () => {
            const { data } = await supabase.from('fixed_scales').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    const { data: cells } = useQuery({
        queryKey: ['cells', churchId], // Fetch all cells for mapping
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Helper: Determine filtered workers for dropdowns
    const filteredWorkers = useMemo(() => {
        if (!workers || !cells) return [];
        if (genderFilter === 'all') return workers;

        const cellGenderMap = cells.reduce((acc, c) => ({ ...acc, [c.id]: c.gender }), {});

        return workers.filter(w => {
            const g = cellGenderMap[w.cell_id];
            return g === genderFilter;
        });
    }, [workers, cells, genderFilter]);

    // Helper: Check if a worker matches the current filter
    const matchesFilter = (workerId) => {
        if (!workerId) return true; // Empty slot matches
        if (genderFilter === 'all') return true;

        const worker = workers?.find(w => w.id === workerId);
        if (!worker) return false;

        const cell = cells?.find(c => c.id === worker.cell_id);
        return cell?.gender === genderFilter;
    };


    // Mutation to save/update assignment
    const assignMutation = useMutation({
        mutationFn: async ({ day, period, area_id, worker_id, existingId }) => {
            if (existingId) {
                if (!worker_id) return supabase.from('work_scale').delete().eq('id', existingId);
                return supabase.from('work_scale').update({ worker_id }).eq('id', existingId);
            }
            if (worker_id) {
                return supabase.from('work_scale').insert({ day, period, area_id, worker_id, church_id: churchId }); // FIXED: church_id
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['work_scale']);
            toast.success('Escala atualizada');
        }
    });

    const handleAssign = (day, period, area_id, worker_id, existingId) => {
        // Prevent overwriting if slot is occupied by other gender (should be blocked by UI but double check)
        if (existingId) {
            const existingAssignment = scales?.find(s => s.id === existingId);
            if (existingAssignment?.worker_id && !matchesFilter(existingAssignment.worker_id)) {
                toast.error('Não é possível alterar uma escala ocupada por outro gênero.');
                return;
            }
        }

        assignMutation.mutate({ day, period, area_id, worker_id: worker_id === "" ? null : worker_id, existingId });
    };

    // Fixed Scale Mutations
    const createFixedScaleMutation = useMutation({
        mutationFn: async (name) => {
            return supabase.from('fixed_scales').insert({ name, church_id: churchId, members: [] }); // FIXED: church_id
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fixed_scales']);
            setIsFixedScaleModalOpen(false);
            setNewFixedScaleName('');
            toast.success('Equipe criada');
        }
    });

    const updateFixedScaleMembersMutation = useMutation({
        mutationFn: async ({ id, members }) => {
            return supabase.from('fixed_scales').update({ members }).eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fixed_scales']);
            toast.success('Membros atualizados');
        }
    });

    const deleteFixedScaleMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('fixed_scales').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['fixed_scales']);
            toast.success('Equipe removida');
        }
    });

    const handleAddMemberToFixedScale = (scale, workerId) => {
        if (!workerId) return;
        const currentMembers = scale.members || [];
        if (currentMembers.includes(workerId)) return;
        updateFixedScaleMembersMutation.mutate({ id: scale.id, members: [...currentMembers, workerId] });
    };

    const handleRemoveMemberFromFixedScale = (scale, workerId) => {
        const currentMembers = scale.members || [];
        updateFixedScaleMembersMutation.mutate({ id: scale.id, members: currentMembers.filter(id => id !== workerId) });
    };

    // Helper to check conflicts
    const getConflict = (workerId, currentDay, currentPeriod) => {
        if (!workerId || !scales) return null;
        const count = scales.filter(s => s.worker_id === workerId && s.day === currentDay && s.period === currentPeriod).length;
        return count > 1;
    };

    // Or check if selected worker is ALREADY assigned to another area in this period
    const isWorkerBusy = (workerId, currentAreaId, currentDay, currentPeriod) => {
        const busy = scales?.some(s =>
            s.worker_id === workerId &&
            s.day === currentDay &&
            s.period === currentPeriod &&
            s.area_id !== currentAreaId
        );
        return busy;
    };

    if (!areas || !workers) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Escalas de Trabalho</h1>
                    <p className="text-slate-500">Organize os voluntários por dia e área de serviço.</p>
                </div>

                {/* View Mode Toggle */}
                <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            viewMode === 'daily' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Escalas Diárias
                    </button>
                    <button
                        onClick={() => setViewMode('fixed')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            viewMode === 'fixed' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Escalas Fixas
                    </button>
                </div>
            </div>

            {viewMode === 'daily' ? (
                <>
                    {/* Tabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 mt-6 pb-2 gap-4">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {days.map((day) => (
                                <button
                                    key={day}
                                    onClick={() => setActiveTab(day)}
                                    className={cn(
                                        activeTab === day
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                        'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                                    )}
                                >
                                    {day === 'Friday' ? 'Sexta-feira' : day === 'Saturday' ? 'Sábado' : 'Domingo'}
                                </button>
                            ))}
                        </nav>
                        <button
                            onClick={() => generateScalePDF(activeTab, scales, areas, workers, cells, genderFilter)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-500 shadow-sm transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            Gerar PDF Completo (Sexta a Domingo)
                        </button>

                    </div>


                    <div className="space-y-8 mt-6">
                        {periods.map(period => (
                            <Card key={period}>
                                <CardHeader className="bg-slate-50 border-b border-slate-200">
                                    <CardTitle className="text-base font-bold text-slate-700 uppercase tracking-wider">
                                        {period === 'Breakfast' ? 'Café da Manhã' :
                                            period === 'Lunch' ? 'Almoço' :
                                                period === 'Afternoon' ? 'Lanche da Tarde' : 'Jantar'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-200">
                                        {areas.map(area => {
                                            // Filter assignments to ONLY show those matching the current gender filter
                                            const areaAssignments = scales?.filter(s =>
                                                s.day === activeTab &&
                                                s.period === period &&
                                                s.area_id === area.id &&
                                                matchesFilter(s.worker_id)
                                            ) || [];
                                            const slots = Array.from({ length: area.required_people });

                                            return (
                                                <div key={area.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 items-center hover:bg-slate-50">
                                                    <div className="md:col-span-1">
                                                        <p className="font-medium text-sm text-slate-900">{area.name}</p>
                                                        <p className="text-xs text-slate-500">{area.required_people} pessoas necessárias</p>
                                                    </div>
                                                    <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {slots.map((_, index) => {
                                                            const existing = areaAssignments[index];
                                                            const conflict = existing?.worker_id && isWorkerBusy(existing.worker_id, area.id, activeTab, period);

                                                            // Get already selected workers in this area/period to prevent duplicates
                                                            const selectedWorkerIds = areaAssignments
                                                                .filter(a => a?.worker_id)
                                                                .map(a => a.worker_id);

                                                            // Filter out already selected workers (except current)
                                                            const availableWorkers = filteredWorkers?.filter(w =>
                                                                !selectedWorkerIds.includes(w.id) || w.id === existing?.worker_id
                                                            ) || [];

                                                            const selectedWorker = workers?.find(w => w.id === existing?.worker_id);

                                                            return (
                                                                <div key={index} className="flex items-center gap-2">
                                                                    <select
                                                                        className={cn(
                                                                            "block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 px-2",
                                                                            conflict ? "ring-red-300 focus:ring-red-500 bg-red-50" : "ring-slate-300 focus:ring-indigo-600"
                                                                        )}
                                                                        value={existing?.worker_id || ""}
                                                                        onChange={(e) => handleAssign(activeTab, period, area.id, e.target.value, existing?.id)}
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {availableWorkers.map(w => (
                                                                            <option key={w.id} value={w.id}>
                                                                                {w.name} {w.surname}
                                                                            </option>
                                                                        ))}
                                                                    </select>

                                                                    {selectedWorker && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setViewingWorker(selectedWorker)}
                                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all flex-shrink-0"
                                                                            title="Ver informações"
                                                                        >
                                                                            <Info className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                    {conflict && (
                                                                        <div className="relative group">
                                                                            <AlertTriangle className="h-5 w-5 text-red-500 cursor-help" />
                                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded py-1 px-2 text-center z-10">
                                                                                Esta pessoa já está escalada em outra área neste período!
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            ) : (
                /* Fixed Scales View */
                <div className="space-y-6">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => generateFixedScalePDF(fixedScales, workers, cells, genderFilter)}
                            className="flex items-center gap-2 rounded-md bg-white border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <FileText className="h-4 w-4 text-green-600" />
                            Gerar PDF de Equipes
                        </button>

                        <button
                            onClick={() => setIsFixedScaleModalOpen(true)}
                            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        >
                            <Plus className="h-4 w-4" />
                            Nova Equipe Fixa
                        </button>
                    </div>


                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {fixedScales?.map(scale => (
                            <Card key={scale.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold">{scale.name}</CardTitle>
                                        <CardDescription>{scale.members?.length || 0} membros</CardDescription>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja excluir esta equipe?')) {
                                                deleteFixedScaleMutation.mutate(scale.id);
                                            }
                                        }}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="min-h-[100px] space-y-2">
                                            {scale.members?.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic">Nenhum membro adicionado.</p>
                                            ) : (
                                                scale.members?.map(memberId => {
                                                    const member = workers.find(w => w.id === memberId);

                                                    // STRICT SEPARATION for Fixed Scales
                                                    // Check if member matches logic.
                                                    // If filter is active (not 'all'), and member is opposite gender, hide them or show placeholder?
                                                    // User said "pra homem não aparecer no de mulher".
                                                    // If I show "Occupied", it's fine.
                                                    // But fixed scales are teams. If I'm creating a "Kitchen Team", maybe it's mixed?
                                                    // But user strictly asked for separation here too.
                                                    // Let's hide opposite gender members from the list completely OR show "Outro Gênero" placeholder.
                                                    // Given "não aparecer", maybe hiding is better?
                                                    // BUT if I hide, I can't see team size.
                                                    // Let's follow "Occupied" pattern for consistency.

                                                    const isMemberMatch = matchesFilter(memberId);

                                                    if (!isMemberMatch) {
                                                        // If strict separation, user shouldn't even KNOW a woman is in this team if they are in 'Male' view?
                                                        // Or should they just not edit it?
                                                        // User said: "pra homem não aparecer no de mulher".
                                                        // This implies invisibility.
                                                        // But if I create a team "Band", and it has men and women.
                                                        // If I am filtered to 'Male', I only see the men in the band.
                                                        // This seems to be what is requested.
                                                        return null; // Hide completely in Fixed Scale list?
                                                    }


                                                    return (
                                                        <div key={memberId} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded-md">
                                                            <span className="font-medium text-slate-700">{member?.name || 'Desconhecido'} {member?.surname}</span>
                                                            <button
                                                                onClick={() => handleRemoveMemberFromFixedScale(scale, memberId)}
                                                                className="text-slate-400 hover:text-red-500"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )
                                                }).filter(Boolean)
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-slate-100">
                                            <select
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                onChange={(e) => {
                                                    handleAddMemberToFixedScale(scale, e.target.value);
                                                    e.target.value = "";
                                                }}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Adicionar membro...</option>
                                                {/* Filter dropdown to only show matching gender workers */}
                                                {filteredWorkers.filter(w => !scale.members?.includes(w.id)).map(w => (
                                                    <option key={w.id} value={w.id}>{w.name} {w.surname}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Modal
                        isOpen={isFixedScaleModalOpen}
                        onClose={() => setIsFixedScaleModalOpen(false)}
                        title="Nova Equipe Fixa"
                    >
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (newFixedScaleName) createFixedScaleMutation.mutate(newFixedScaleName);
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome da Equipe</label>
                                <input
                                    value={newFixedScaleName}
                                    onChange={(e) => setNewFixedScaleName(e.target.value)}
                                    placeholder="Ex: Equipe de Cozinha, Servir Almoço"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsFixedScaleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500">Criar</button>
                            </div>
                        </form>
                    </Modal>
                </div>
            )}

            {/* Worker Info Modal */}
            <WorkerInfoModal
                worker={viewingWorker}
                cells={cells}
                isOpen={!!viewingWorker}
                onClose={() => setViewingWorker(null)}
            />
        </div>
    );
}
