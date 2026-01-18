import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { WorkerSelectorModal } from '../components/ui/WorkerSelectorModal';
import {
    Users,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Circle,
    Search,
    UserCheck,
    Utensils,
    Trash2,
    Plus,
    User
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Attendance() {
    const { churchId } = useAuth();
    const { genderFilter, matchesFilter } = useFilter();
    const queryClient = useQueryClient();

    // -- Modal States --
    const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
    const [selectedFoodItem, setSelectedFoodItem] = useState(null);

    // -- Queries --

    // 1. Workers (All, linked to cells)
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

    // 2. Passers (Only paid)
    const { data: passers } = useQuery({
        queryKey: ['passers', churchId],
        queryFn: async () => {
            const { data } = await supabase
                .from('passers')
                .select('*, cells(name, gender)')
                .eq('church_id', churchId)
                .eq('payment_status', 'ok') // Only paid
                .order('name');
            return data;
        },
        enabled: !!churchId
    });

    // 3. Attendance Records
    const { data: attendance } = useQuery({
        queryKey: ['attendance', churchId],
        queryFn: async () => {
            const { data } = await supabase
                .from('attendance')
                .select('*')
                .eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // 4. Food Assignments
    const { data: foodAssignments } = useQuery({
        queryKey: ['food_assignments', churchId],
        queryFn: async () => {
            const { data } = await supabase
                .from('food_assignments')
                .select('*, workers(name, surname)')
                .eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // -- Mutations --

    const updateAttendanceMutation = useMutation({
        mutationFn: async ({ personId, personType, slot, status }) => {
            // Delete if status is 'none', else upsert
            if (status === 'none') {
                return supabase.from('attendance')
                    .delete()
                    .match({ person_id: personId, slot_number: slot });
            } else {
                return supabase.from('attendance')
                    .upsert({
                        church_id: churchId,
                        person_id: personId,
                        person_type: personType,
                        slot_number: slot,
                        status: status
                    }, { onConflict: 'person_id, slot_number' });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['attendance', churchId]);
        }
    });

    const addFoodAssignmentMutation = useMutation({
        mutationFn: async ({ workerId, itemName }) => {
            return supabase.from('food_assignments').insert({
                church_id: churchId,
                worker_id: workerId,
                item_name: itemName
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['food_assignments', churchId]);
            toast.success('Trabalhador adicionado ao item');
        }
    });

    const removeFoodAssignmentMutation = useMutation({
        mutationFn: async (id) => {
            return supabase.from('food_assignments').delete().eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['food_assignments', churchId]);
            toast.success('Removido com sucesso');
        }
    });


    // -- Derived State (Filtering) --

    const filteredWorkers = useMemo(() => {
        if (!workers) return [];
        return workers.filter(w => matchesFilter(w.gender || w.cells?.gender));
    }, [workers, matchesFilter]);

    const filteredPassers = useMemo(() => {
        if (!passers) return [];
        return passers.filter(p => matchesFilter(p.gender || p.cells?.gender)); // Assuming passers/cells have gender
        // Note: Passers table might not have gender directly, relies on joined cell gender if schema matches. 
        // If passer table doesn't have gender column, we rely on joined cell. 
        // Safe check: p.cells?.gender. 
        // If matchesFilter is strict, we ensure we filter correctly.
    }, [passers, matchesFilter]);


    // -- Handlers --

    const getStatus = (personId, slot) => {
        const record = attendance?.find(a => a.person_id === personId && a.slot_number === slot);
        return record?.status || 'none';
    };

    const handleToggle = (personId, personType, slot) => {
        const current = getStatus(personId, slot);
        const cycle = {
            'none': 'present',
            'present': 'absent',
            'absent': 'justified',
            'justified': 'none'
        };
        const next = cycle[current];
        updateAttendanceMutation.mutate({ personId, personType, slot, status: next });
    };

    const renderIcon = (status) => {
        switch (status) {
            case 'present': return <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />;
            case 'absent': return <XCircle className="w-5 h-5 text-red-500 fill-red-50" />;
            case 'justified': return <MinusCircle className="w-5 h-5 text-yellow-500 fill-yellow-50" />;
            default: return <Circle className="w-5 h-5 text-slate-300" />;
        }
    };

    // Food Items List
    const foodItems = [
        "Arroz parborizado 5kg",
        "Feijão preto de 1kg",
        "Lata de oleo",
        "Pote de margarina",
        "Acucar de 5kg",
        "Cafe",
        "Leite fardos",
        "Bandejas de ovos",
        "Farinha Edna"
    ];

    // -- Statistics for Workers --
    const workerStats = useMemo(() => {
        let present = 0, absent = 0, justified = 0;
        // Count ONLY for the filtered workers to match UI
        const visibleWorkerIds = new Set(filteredWorkers.map(w => w.id));

        attendance?.forEach(a => {
            if (a.person_type === 'worker' && visibleWorkerIds.has(a.person_id)) {
                if (a.status === 'present') present++;
                if (a.status === 'absent') absent++;
                if (a.status === 'justified') justified++;
            }
        });
        return { present, absent, justified };
    }, [attendance, filteredWorkers]);


    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Lista de Chamada</h1>
                <p className="text-slate-500">Gestão de presença e doações de alimentos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* --- 1. WORKERS ATTENDANCE --- */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Trabalhadores
                        </CardTitle>
                        <div className="flex gap-3 text-xs font-bold">
                            <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {workerStats.present}</span>
                            <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> {workerStats.absent}</span>
                            <span className="text-yellow-600 flex items-center gap-1"><MinusCircle className="w-3 h-3" /> {workerStats.justified}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {/* Header */}
                            <div className="grid grid-cols-12 bg-slate-50 py-2 px-4 text-xs font-semibold text-slate-500">
                                <div className="col-span-7">Nome / Célula</div>
                                <div className="col-span-5 flex justify-between px-1">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                </div>
                            </div>

                            {filteredWorkers.map(worker => (
                                <div key={worker.id} className="grid grid-cols-12 items-center py-3 px-4 hover:bg-slate-50">
                                    <div className="col-span-7 flex items-center gap-3">
                                        {worker.photo_url ? (
                                            <img src={worker.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{worker.name} {worker.surname}</p>
                                            <p className="text-xs text-slate-500 truncate">{worker.cells?.name}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-5 flex justify-between items-center">
                                        {[1, 2, 3, 4, 5].map(slot => (
                                            <button
                                                key={slot}
                                                onClick={() => handleToggle(worker.id, 'worker', slot)}
                                                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                                            >
                                                {renderIcon(getStatus(worker.id, slot))}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {filteredWorkers.length === 0 && (
                                <div className="p-8 text-center text-slate-500 text-sm">Nenhum trabalhador encontrado.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* --- 2. PASSERS ATTENDANCE --- */}
                <Card className="shadow-sm h-fit">
                    <CardHeader className="border-b pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                            Passantes (Pagos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="bg-slate-50 py-2 px-4 text-xs font-semibold text-slate-500 border-b">
                            Lista de Presença
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {filteredPassers.map(passer => (
                                <div key={passer.id} className="flex items-center justify-between py-3 px-4 hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        {passer.photo_url ? (
                                            <img src={passer.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{passer.name} {passer.surname}</p>
                                            <p className="text-xs text-slate-500">{passer.cells?.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggle(passer.id, 'passer', 1)}
                                    >
                                        {/* Simple check for passers */}
                                        {getStatus(passer.id, 1) === 'present' ? (
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-slate-300" />
                                        )}
                                    </button>
                                </div>
                            ))}
                            {filteredPassers.length === 0 && (
                                <div className="p-4 text-center text-slate-500 text-xs">Nenhum passante pago encontrado.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* --- 3. FOOD LIST --- */}
                <Card className="lg:col-span-3 shadow-sm mt-4">
                    <CardHeader className="border-b pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-orange-600" />
                            Lista de Alimentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {foodItems.map(item => {
                                // Filter assignments for this item
                                const assigned = foodAssignments?.filter(a => a.item_name === item);

                                return (
                                    <div key={item} className="border rounded-lg p-3 bg-slate-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-sm text-slate-800">{item}</h3>
                                            <button
                                                onClick={() => { setSelectedFoodItem(item); setIsFoodModalOpen(true); }}
                                                className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"
                                                title="Adicionar pessoa"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* List of assigned workers */}
                                        <div className="space-y-1">
                                            {assigned?.map(assign => (
                                                <div key={assign.id} className="flex justify-between items-center bg-white border border-slate-200 px-2 py-1 rounded text-xs">
                                                    <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                                        {assign.workers?.name} {assign.workers?.surname}
                                                    </span>
                                                    <button
                                                        onClick={() => removeFoodAssignmentMutation.mutate(assign.id)}
                                                        className="text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!assigned || assigned.length === 0) && (
                                                <div className="text-[10px] text-slate-400 italic py-1">Ninguém atribuído</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Helper Modal */}
            <WorkerSelectorModal
                isOpen={isFoodModalOpen}
                onClose={() => setIsFoodModalOpen(false)}
                workers={filteredWorkers} // Selecting from currently visible workers
                onSelect={(worker) => addFoodAssignmentMutation.mutate({
                    workerId: worker.id,
                    itemName: selectedFoodItem
                })}
                title={`Quem vai trazer: ${selectedFoodItem}?`}
            />

        </div>
    );
}
