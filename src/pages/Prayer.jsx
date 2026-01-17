import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { addHours, format, parseISO, isSameHour, isWithinInterval, startOfHour } from 'date-fns'; // Basic usage
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';

export default function Prayer() {
    const queryClient = useQueryClient();
    const [viewingWorker, setViewingWorker] = useState(null);

    // Define Event Start (Mock Date for "Friday")
    // Let's assume the event is "next Friday". For mock, we'll fix a date or just use Generic "Fri/Sat/Sun".
    // User Requirement: "Friday 19:00 to Sunday 19:00".
    // Ideally, this should be configurable. For now, I'll generate generic slots 0-47.
    // And label them "Sexta 19:00", "Sexta 20:00"...

    const slots = useMemo(() => {
        const slotsArr = [];
        const days = ['Sexta', 'Sábado', 'Domingo'];
        let dayIndex = 0;
        let hour = 19; // Start Friday 19:00

        for (let i = 0; i < 49; i++) { // 48 hours + 1 to close? No, 48 slots.
            // Format label
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            const dayLabel = days[dayIndex];

            slotsArr.push({
                id: `slot-${i}`,
                day: dayLabel, // For display
                time: timeLabel,
                absoluteHour: i // 0 to 47
            });

            hour++;
            if (hour >= 24) {
                hour = 0;
                dayIndex++;
            }
        }
        return slotsArr;
    }, []);

    // Fetch Data
    const { data: prayerAssignments } = useQuery({
        queryKey: ['prayer_clock'],
        queryFn: async () => {
            const { data } = await supabase.from('prayer_clock').select('*');
            return data || [];
        }
    });

    // Fetch Cells to map names
    const { data: cells } = useQuery({
        queryKey: ['cells'],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*');
            return data || [];
        }
    });

    const { data: workers } = useQuery({
        queryKey: ['workers'],
        queryFn: async () => {
            // Join isn't real in mock, so we just fetch all workers
            const { data } = await supabase.from('workers').select('*');
            return data || [];
        }
    });

    // Helper to get worker display info
    const getWorkerDisplay = (workerId) => {
        const worker = workers?.find(w => w.id === workerId);
        if (!worker) return null;
        const cell = cells?.find(c => c.id === worker.cell_id);
        return { ...worker, cellName: cell?.name };
    };

    const { data: workScale } = useQuery({
        queryKey: ['work_scale'],
        queryFn: async () => {
            const { data } = await supabase.from('work_scale').select('*');
            return data || [];
        }
    });

    // Mutation
    const assignMutation = useMutation({
        mutationFn: async ({ slotId, workerId, position }) => { // position 1 or 2
            const existing = prayerAssignments?.find(p => p.id === slotId);
            const updates = position === 1 ? { worker_1_id: workerId } : { worker_2_id: workerId };

            if (existing) {
                return supabase.from('prayer_clock').update(updates).eq('id', slotId);
            } else {
                return supabase.from('prayer_clock').insert({
                    id: slotId,
                    ...updates,
                    church_id: 'church-1',
                    start_time: 'mock', // Should be real date
                    end_time: 'mock'
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['prayer_clock']);
            toast.success('Escala de oração atualizada');
        }
    });

    const handleAssign = (slotId, workerId, position) => {
        assignMutation.mutate({ slotId, workerId: workerId === "" ? null : workerId, position });
    };

    // Conflict Detection
    const hasConflict = (workerId, slot) => {
        if (!workerId || !workScale) return false;

        // We need to map Slot Time (e.g., Sat 12:00) to Work Scale Period (Lunch @ Sat).
        // Hardcoded mapping for MVP:
        // Friday 19:00 - 24:00 ? Dinner maybe?
        // Saturday 07:00 - 09:00 -> Breakfast
        // Saturday 12:00 - 14:00 -> Lunch
        // Saturday 19:00 - 21:00 -> Dinner

        const dayMap = { 'Sexta': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday' };
        const currentDay = dayMap[slot.day];
        const hour = parseInt(slot.time.split(':')[0]);

        let conflictingPeriod = null;

        if (hour >= 7 && hour <= 9) conflictingPeriod = 'Breakfast'; // Rough guess
        if (hour >= 12 && hour <= 14) conflictingPeriod = 'Lunch';
        if (hour >= 16 && hour <= 17) conflictingPeriod = 'Afternoon';
        if (hour >= 19 && hour <= 21) conflictingPeriod = 'Dinner';

        if (conflictingPeriod) {
            // Check if worker is in workScale for this day/period
            const assignment = workScale.find(s =>
                s.worker_id === workerId &&
                s.day === currentDay &&
                s.period === conflictingPeriod
            );
            if (assignment) return true;
        }
        return false;
    };

    if (!workers) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relógio de Oração</h1>
                    <p className="text-slate-500">Cobre 48 horas ininterruptas de oração.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 py-3 text-center">
                    <div className="col-span-2">Horário</div>
                    <div className="col-span-5 border-l border-slate-200">Guerreiro 1</div>
                    <div className="col-span-5 border-l border-slate-200">Guerreiro 2</div>
                </div>
                <div className="divide-y divide-gray-100">
                    {slots.map((slot) => {
                        const assignment = prayerAssignments?.find(p => p.id === slot.id);
                        const conflict1 = hasConflict(assignment?.worker_1_id, slot);
                        const conflict2 = hasConflict(assignment?.worker_2_id, slot);

                        return (
                            <div key={slot.id} className="grid grid-cols-12 items-center hover:bg-slate-50 transition-colors">
                                <div className="col-span-2 py-3 px-4 flex flex-col items-center justify-center text-sm">
                                    <span className="font-bold text-slate-700">{slot.time}</span>
                                    <span className="text-xs text-slate-400 capitalize">{slot.day}</span>
                                </div>

                                {/* Worker 1 */}
                                <div className="col-span-5 p-2 border-l border-slate-100">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <select
                                                className={cn(
                                                    "block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-2 text-xs",
                                                    conflict1 && "bg-red-50 text-red-900 ring-red-300"
                                                )}
                                                value={assignment?.worker_1_id || ""}
                                                onChange={(e) => handleAssign(slot.id, e.target.value, 1)}
                                            >
                                                <option value="">-- Vazio --</option>
                                                {workers?.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name} {w.surname}</option>
                                                ))}
                                            </select>
                                            {assignment?.worker_1_id && workers?.find(w => w.id === assignment.worker_1_id) && (
                                                <button
                                                    onClick={() => setViewingWorker(workers.find(w => w.id === assignment.worker_1_id))}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all flex-shrink-0"
                                                    title="Ver informações"
                                                >
                                                    <Info className="h-4 w-4" />
                                                </button>
                                            )}
                                            {conflict1 && (
                                                <div title="Conflito de horário com Escala de Trabalho">
                                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                        {assignment?.worker_1_id && (
                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full w-fit">
                                                {getWorkerDisplay(assignment.worker_1_id)?.cellName || "Sem Célula"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Worker 2 */}
                                <div className="col-span-5 p-2 border-l border-slate-100">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <select
                                                className={cn(
                                                    "block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-2 text-xs",
                                                    conflict2 && "bg-red-50 text-red-900 ring-red-300"
                                                )}
                                                value={assignment?.worker_2_id || ""}
                                                onChange={(e) => handleAssign(slot.id, e.target.value, 2)}
                                            >
                                                <option value="">-- Vazio --</option>
                                                {workers?.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name} {w.surname}</option>
                                                ))}
                                            </select>
                                            {assignment?.worker_2_id && workers?.find(w => w.id === assignment.worker_2_id) && (
                                                <button
                                                    onClick={() => setViewingWorker(workers.find(w => w.id === assignment.worker_2_id))}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all flex-shrink-0"
                                                    title="Ver informações"
                                                >
                                                    <Info className="h-4 w-4" />
                                                </button>
                                            )}
                                            {conflict2 && (
                                                <div title="Conflito de horário com Escala de Trabalho">
                                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                        {assignment?.worker_2_id && (
                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full w-fit">
                                                {getWorkerDisplay(assignment.worker_2_id)?.cellName || "Sem Célula"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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
