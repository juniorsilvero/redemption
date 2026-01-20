import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { WorkerSelectorModal } from '../components/ui/WorkerSelectorModal';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';
import {
    Users,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Circle,
    UserCheck,
    Utensils,
    Trash2,
    Plus,
    User,
    ArrowLeft,
    ChevronRight,
    Square,
    CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Attendance() {
    const { churchId } = useAuth();
    const { genderFilter, matchesFilter } = useFilter();
    const queryClient = useQueryClient();
    const [view, setView] = useState('menu'); // 'menu', 'workers', 'passers', 'food'

    // -- Modal States --
    const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
    const [selectedFoodItem, setSelectedFoodItem] = useState(null);
    const [selectedWorkerInfo, setSelectedWorkerInfo] = useState(null);

    // -- Queries --

    const { data: workers } = useQuery({
        queryKey: ['workers', churchId],
        queryFn: async () => {
            const { data } = await supabase
                .from('workers')
                .select('*, cells(name, gender)')
                .eq('church_id', churchId)
                .order('name');
            return data;
        },
        enabled: !!churchId
    });

    const { data: passers } = useQuery({
        queryKey: ['passers', churchId],
        queryFn: async () => {
            const { data } = await supabase
                .from('passers')
                .select('*, cells(name, gender)')
                .eq('church_id', churchId)
                .eq('payment_status', 'paid') // Fixed: 'paid' instead of 'ok'
                .order('name');
            return data;
        },
        enabled: !!churchId
    });

    const { data: attendance } = useQuery({
        queryKey: ['attendance', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('attendance').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    const { data: foodAssignments } = useQuery({
        queryKey: ['food_assignments', churchId],
        queryFn: async () => {
            const { data } = await supabase
                .from('food_assignments')
                .select('*, workers(*, cells(name, gender))') // Fetch FULL worker info + cell info
                .eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });


    // -- Mutations --
    const updateAttendanceMutation = useMutation({
        mutationFn: async ({ personId, personType, slot, status }) => {
            if (status === 'none') {
                return supabase.from('attendance').delete().match({ person_id: personId, slot_number: slot });
            } else {
                return supabase.from('attendance').upsert({
                    church_id: churchId,
                    person_id: personId,
                    person_type: personType,
                    slot_number: slot,
                    status: status
                }, { onConflict: 'person_id, slot_number' });
            }
        },
        // Optimistic Update for instant UI response
        onMutate: async ({ personId, personType, slot, status }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries(['attendance', churchId]);

            // Snapshot previous value
            const previousAttendance = queryClient.getQueryData(['attendance', churchId]);

            // Optimistically update cache
            queryClient.setQueryData(['attendance', churchId], (old) => {
                if (!old) return old;

                // Remove existing record for this person/slot
                const filtered = old.filter(a => !(a.person_id === personId && a.slot_number === slot));

                // Add new record if not 'none'
                if (status !== 'none') {
                    filtered.push({
                        person_id: personId,
                        person_type: personType,
                        slot_number: slot,
                        status: status,
                        church_id: churchId
                    });
                }

                return filtered;
            });

            return { previousAttendance };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousAttendance) {
                queryClient.setQueryData(['attendance', churchId], context.previousAttendance);
            }
            toast.error('Erro ao salvar presença');
        },
        onSettled: () => {
            // Refetch in background to ensure consistency (but UI already updated)
            queryClient.invalidateQueries(['attendance', churchId]);
        }
    });

    const addFoodAssignmentMutation = useMutation({
        mutationFn: async ({ workerId, itemName }) => {
            return supabase.from('food_assignments').insert({ church_id: churchId, worker_id: workerId, item_name: itemName });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['food_assignments', churchId]);
            toast.success('Adicionado com sucesso');
        }
    });

    const removeFoodAssignmentMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('food_assignments').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['food_assignments', churchId]);
            toast.success('Removido');
        }
    });

    const toggleFoodDeliveryMutation = useMutation({
        mutationFn: async ({ id, currentStatus }) => {
            return supabase.from('food_assignments').update({ delivered: !currentStatus }).eq('id', id);
        },
        onSuccess: () => queryClient.invalidateQueries(['food_assignments', churchId])
    });


    // -- Derived State --
    // -- Derived State --
    const getPersonGender = (person) => {
        const gender = person.gender || (Array.isArray(person.cells) ? person.cells[0]?.gender : person.cells?.gender);
        return gender?.toLowerCase();
    };

    const filteredWorkers = useMemo(() => {
        if (!workers) return [];
        return workers.filter(w => matchesFilter(getPersonGender(w)));
    }, [workers, matchesFilter]);

    const filteredPassers = useMemo(() => {
        if (!passers) return [];
        return passers.filter(p => matchesFilter(getPersonGender(p)));
    }, [passers, matchesFilter]);


    // -- Handlers --
    const getStatus = (personId, slot) => {
        const record = attendance?.find(a => a.person_id === personId && a.slot_number === slot);
        return record?.status || 'none';
    };

    const handleToggle = (personId, personType, slot) => {
        const current = getStatus(personId, slot);
        const cycle = { 'none': 'present', 'present': 'absent', 'absent': 'justified', 'justified': 'none' };
        updateAttendanceMutation.mutate({ personId, personType, slot, status: cycle[current] });
    };

    const renderIcon = (status) => {
        switch (status) {
            case 'present': return <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />;
            case 'absent': return <XCircle className="w-5 h-5 text-red-500 fill-red-50" />;
            case 'justified': return <MinusCircle className="w-5 h-5 text-yellow-500 fill-yellow-50" />;
            default: return <Circle className="w-5 h-5 text-slate-300" />;
        }
    };

    // -- Sub-Components (Views) --

    const WorkersView = () => {
        const stats = useMemo(() => {
            let present = 0, absent = 0, justified = 0;
            const visibleIds = new Set(filteredWorkers.map(w => w.id));
            attendance?.forEach(a => {
                if (a.person_type === 'worker' && visibleIds.has(a.person_id)) {
                    if (a.status === 'present') present++;
                    if (a.status === 'absent') absent++;
                    if (a.status === 'justified') justified++;
                }
            });
            return { present, absent, justified };
        }, [attendance, filteredWorkers]); // Depend on attendance and filteredWorkers

        return (
            <div className="space-y-4">
                <button onClick={() => setView('menu')} className="flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </button>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b gap-4">
                        <CardTitle className="flex items-center gap-2 text-indigo-700">
                            <Users className="w-6 h-6" />
                            Trabalhadores
                        </CardTitle>
                        <div className="flex gap-4 text-sm font-bold bg-slate-50 p-2 rounded-lg">
                            <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {stats.present}</span>
                            <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> {stats.absent}</span>
                            <span className="text-yellow-600 flex items-center gap-1"><MinusCircle className="w-4 h-4" /> {stats.justified}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            <div className="grid grid-cols-12 bg-slate-50 py-3 px-4 text-xs font-semibold text-slate-500 sticky top-0 md:static">
                                <div className="col-span-12 md:col-span-7 mb-2 md:mb-0">Nome / Célula</div>
                                <div className="col-span-12 md:col-span-5 flex justify-between px-1">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                </div>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto">
                                {filteredWorkers.map(worker => (
                                    <div key={worker.id} className="grid grid-cols-12 items-center py-3 px-4 hover:bg-slate-50 border-b border-slate-50">
                                        <div className="col-span-12 md:col-span-7 flex items-center gap-3 mb-3 md:mb-0">
                                            {worker.photo_url ? (
                                                <img src={worker.photo_url} className="w-10 h-10 rounded-full object-cover shadow-sm bg-white" alt="" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <User className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{worker.name} {worker.surname}</p>
                                                <p className="text-xs text-slate-500">{worker.cells?.name}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-5 flex justify-between items-center sm:px-4">
                                            {[1, 2, 3, 4, 5].map(slot => (
                                                <button
                                                    key={slot}
                                                    onClick={() => handleToggle(worker.id, 'worker', slot)}
                                                    className="p-1.5 hover:bg-slate-200 rounded-full transition-transform active:scale-95"
                                                >
                                                    {renderIcon(getStatus(worker.id, slot))}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {filteredWorkers.length === 0 && <div className="p-8 text-center text-slate-500">Nenhum trabalhador encontrado.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    };

    const PassersView = () => (
        <div className="space-y-4">
            <button onClick={() => setView('menu')} className="flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>
            <Card className="shadow-sm">
                <CardHeader className="border-b pb-3">
                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                        <UserCheck className="w-6 h-6" />
                        Passantes (Pagos)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="bg-slate-50 py-2 px-4 text-xs font-semibold text-slate-500 border-b">Lista de Presença</div>
                    <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                        {filteredPassers.map(passer => (
                            <div key={passer.id} className="flex items-center justify-between py-3 px-4 hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    {passer.photo_url ? (
                                        <img src={passer.photo_url} className="w-10 h-10 rounded-full object-cover shadow-sm bg-white" alt="" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{passer.name} {passer.surname}</p>
                                        <p className="text-xs text-slate-500">{passer.cells?.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleToggle(passer.id, 'passer', 1)} className="p-2 hover:bg-slate-100 rounded-full">
                                    {getStatus(passer.id, 1) === 'present' ? <CheckCircle2 className="w-8 h-8 text-emerald-600 fill-emerald-50" /> : <Circle className="w-8 h-8 text-slate-300" />}
                                </button>
                            </div>
                        ))}
                        {filteredPassers.length === 0 && <div className="p-8 text-center text-slate-500">Nenhum passante pago encontrado.</div>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const FoodView = () => {
        const items = ["Arroz parborizado 5kg", "Feijão preto de 1kg", "Lata de oleo", "Pote de margarina", "Acucar de 5kg", "Cafe", "Leite fardos", "Bandejas de ovos", "Farinha Edna"];
        return (
            <div className="space-y-4">
                <button onClick={() => setView('menu')} className="flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </button>
                <Card className="shadow-sm">
                    <CardHeader className="border-b pb-3">
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <Utensils className="w-6 h-6" />
                            Lista de Alimentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(item => {
                                // Strictly filter assignments based on the assigned worker's gender AND the global filter
                                const assigned = foodAssignments?.filter(a => {
                                    if (a.item_name !== item) return false;
                                    // Check if worker matches current filter
                                    // We need worker data in result.
                                    const workerGender = a.workers?.gender || a.workers?.cells?.gender;
                                    return matchesFilter(workerGender);
                                });

                                return (
                                    <div key={item} className="border rounded-lg p-3 bg-slate-50 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-semibold text-sm text-slate-800">{item}</h3>
                                            <button onClick={() => { setSelectedFoodItem(item); setIsFoodModalOpen(true); }} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded bg-white border border-indigo-100 shadow-sm transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {assigned?.map(assign => (
                                                <div key={assign.id} className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-md text-xs shadow-sm">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <button
                                                            onClick={() => toggleFoodDeliveryMutation.mutate({ id: assign.id, currentStatus: assign.delivered })}
                                                            className="text-slate-400 hover:text-green-600 transition-colors"
                                                            title={assign.delivered ? "Marcar como pendente" : "Marcar como entregue"}
                                                        >
                                                            {assign.delivered ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4" />}
                                                        </button>
                                                        <span
                                                            onClick={() => setSelectedWorkerInfo(assign.workers)}
                                                            className={cn(
                                                                "font-medium truncate max-w-[120px] cursor-pointer hover:underline decoration-1 underline-offset-2",
                                                                assign.delivered ? "text-green-600" : "text-slate-700"
                                                            )}
                                                        >
                                                            {assign.workers?.name} {assign.workers?.surname}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => removeFoodAssignmentMutation.mutate(assign.id)} className="text-slate-400 hover:text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!assigned || assigned.length === 0) && <div className="text-[10px] text-slate-400 italic py-2 text-center bg-slate-100/50 rounded border border-dashed border-slate-200">Vazio</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <WorkerInfoModal
                    isOpen={!!selectedWorkerInfo}
                    onClose={() => setSelectedWorkerInfo(null)}
                    worker={selectedWorkerInfo}
                    cells={selectedWorkerInfo?.cells ? [{ ...selectedWorkerInfo?.cells, id: selectedWorkerInfo?.cell_id }] : []} // Best effort cell mapping
                    allWorkers={workers}
                    allPassers={passers}
                    onSwitchWorker={setSelectedWorkerInfo}
                />
            </div>
        )
    };

    // -- Menu View --
    const MenuView = () => (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Lista de Chamada</h1>
                <p className="text-slate-500">Selecione uma categoria para gerenciar.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => setView('workers')} className="group flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                        <Users className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Trabalhadores</h3>
                    <p className="text-sm text-slate-500 mt-2 text-center">Gerenciar presença de {filteredWorkers.length} membros</p>
                    <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium">Acessar <ChevronRight className="w-4 h-4 ml-1" /></div>
                </button>

                <button onClick={() => setView('passers')} className="group flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                        <UserCheck className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Passantes</h3>
                    <p className="text-sm text-slate-500 mt-2 text-center">Check-in de {filteredPassers.length} pagos</p>
                    <div className="mt-4 flex items-center text-emerald-600 text-sm font-medium">Acessar <ChevronRight className="w-4 h-4 ml-1" /></div>
                </button>

                <button onClick={() => setView('food')} className="group flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all">
                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                        <Utensils className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Alimentos</h3>
                    <p className="text-sm text-slate-500 mt-2 text-center">Gerenciar lista de doações</p>
                    <div className="mt-4 flex items-center text-orange-600 text-sm font-medium">Acessar <ChevronRight className="w-4 h-4 ml-1" /></div>
                </button>
            </div>
        </div>
    );

    return (
        <div className="pb-20">
            {view === 'menu' && <MenuView />}
            {view === 'workers' && <WorkersView />}
            {view === 'passers' && <PassersView />}
            {view === 'food' && <FoodView />}

            <WorkerSelectorModal
                isOpen={isFoodModalOpen}
                onClose={() => setIsFoodModalOpen(false)}
                workers={filteredWorkers} // Already filtered by gender
                onSelect={(w) => addFoodAssignmentMutation.mutate({ workerId: w.id, itemName: selectedFoodItem })}
                title={`Quem vai trazer: ${selectedFoodItem}?`}
            />
        </div>
    );
}
