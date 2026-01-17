import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { AlertTriangle, Save, Plus, Trash2, Users, Info, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { generateScalePDF, generateFixedScalePDF } from '../utils/pdfGenerator';

import { Modal } from '../components/ui/Modal';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';

export default function Scale() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'fixed'
    const [activeTab, setActiveTab] = useState('Friday'); // Friday, Saturday, Sunday

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
        queryKey: ['work_scale'],
        queryFn: async () => {
            const { data } = await supabase.from('work_scale').select('*');
            return data || [];
        }
    });

    const { data: areas } = useQuery({
        queryKey: ['service_areas'],
        queryFn: async () => {
            const { data } = await supabase.from('service_areas').select('*');
            return data || [];
        }
    });

    const { data: workers } = useQuery({
        queryKey: ['workers'],
        queryFn: async () => {
            const { data } = await supabase.from('workers').select('*');
            return data || [];
        }
    });

    const { data: fixedScales } = useQuery({
        queryKey: ['fixed_scales'],
        queryFn: async () => {
            const { data } = await supabase.from('fixed_scales').select('*');
            return data || [];
        }
    });

    const { data: cells } = useQuery({
        queryKey: ['cells'],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*');
            return data || [];
        }
    });

    // Mutation to save/update assignment
    const assignMutation = useMutation({
        mutationFn: async ({ day, period, area_id, worker_id, existingId }) => {
            if (existingId) {
                if (!worker_id) return supabase.from('work_scale').delete().eq('id', existingId);
                return supabase.from('work_scale').update({ worker_id }).eq('id', existingId);
            }
            if (worker_id) {
                return supabase.from('work_scale').insert({ day, period, area_id, worker_id, church_id: 'church-1' });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['work_scale']);
            toast.success('Escala atualizada');
        }
    });

    const handleAssign = (day, period, area_id, worker_id, existingId) => {
        assignMutation.mutate({ day, period, area_id, worker_id: worker_id === "" ? null : worker_id, existingId });
    };

    // Fixed Scale Mutations
    const createFixedScaleMutation = useMutation({
        mutationFn: async (name) => {
            return supabase.from('fixed_scales').insert({ name, church_id: 'church-1', members: [] });
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
        // Check if this worker is assigned to ANY other area in the SAME period of the SAME day
        // Wait, user said "Visual warning if a person is assigned to multiple tasks at the same time."
        // So checking same Day + Period.
        const otherAssignments = scales.filter(s =>
            s.worker_id === workerId &&
            s.day === currentDay &&
            s.period === currentPeriod
        );

        // If found more than 1 (including pending save?) or ...
        // Actually we are rendering slots. One slot handles one assignment.
        // If the worker ID appears in `scales` for (Day, Period) in DIIFFERENT area, that's a conflict? 
        // Yes, if I am assigning to Kitchen, checking if he is already in Cleaning at the same time.

        // Let's count occurrences of workerId in this (Day, Period)
        const count = scales.filter(s => s.worker_id === workerId && s.day === currentDay && s.period === currentPeriod).length;
        return count > 1; // If more than 1, they are double booked.
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
                            onClick={() => generateScalePDF(activeTab, scales, areas, workers)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-500 shadow-sm transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            Gerar PDF ({activeTab === 'Friday' ? 'Sexta' : activeTab === 'Saturday' ? 'Sábado' : 'Domingo'})
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
                                            const areaAssignments = scales?.filter(s => s.day === activeTab && s.period === period && s.area_id === area.id) || [];
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
                                                            const availableWorkers = workers?.filter(w =>
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
                            onClick={() => generateFixedScalePDF(fixedScales, workers)}
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
                                                })
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
                                                {workers.filter(w => !scale.members?.includes(w.id)).map(w => (
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
