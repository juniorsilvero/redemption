import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { addHours, format, parseISO, isSameHour, isWithinInterval, startOfHour } from 'date-fns'; // Basic usage
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Clock, Info, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';
import { generatePrayerClockPDF } from '../utils/pdfGenerator';


export default function Prayer() {
    const { churchId } = useAuth();
    const queryClient = useQueryClient();
    const [viewingWorker, setViewingWorker] = useState(null);

    // ... slots logic stays same
    const slots = useMemo(() => {
        const slotsArr = [];
        const days = ['Sexta', 'Sábado', 'Domingo'];
        let dayIndex = 0;
        let hour = 19;

        for (let i = 0; i < 49; i++) {
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            const dayLabel = days[dayIndex];

            slotsArr.push({
                id: `slot-${i}`,
                day: dayLabel,
                time: timeLabel,
                absoluteHour: i
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
        queryKey: ['prayer_clock', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('prayer_clock').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    // Fetch Cells to map names
    const { data: cells } = useQuery({
        queryKey: ['cells', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    const { data: workers } = useQuery({
        queryKey: ['workers', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('workers').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
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
        if (workerId) {
            const assignment = prayerAssignments?.find(p => p.id === slotId);
            const otherWorkerId = position === 1 ? assignment?.worker_2_id : assignment?.worker_1_id;

            if (workerId === otherWorkerId) {
                toast.error('Esta pessoa já está escalada nesta mesma posição para este horário!');
                return;
            }
        }
        assignMutation.mutate({ slotId, workerId: workerId === "" ? null : workerId, position });
    };


    // Conflict Detection
    const hasConflict = () => false; // Disabled as per user request


    if (!workers) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relógio de Oração</h1>
                    <p className="text-slate-500">Cobre 48 horas ininterruptas de oração.</p>
                </div>
                <button
                    onClick={() => generatePrayerClockPDF(prayerAssignments || [], slots, workers, cells || [])}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-500 shadow-sm transition-colors"
                >
                    <FileText className="h-4 w-4" />
                    Gerar PDF do Relógio
                </button>
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
                                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-2 text-xs"

                                                value={assignment?.worker_1_id || ""}
                                                onChange={(e) => handleAssign(slot.id, e.target.value, 1)}
                                            >
                                                <option value="">-- Vazio --</option>
                                                {workers?.filter(w => w.id !== assignment?.worker_2_id).map(w => (
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
                                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-2 text-xs"

                                                value={assignment?.worker_2_id || ""}
                                                onChange={(e) => handleAssign(slot.id, e.target.value, 2)}
                                            >
                                                <option value="">-- Vazio --</option>
                                                {workers?.filter(w => w.id !== assignment?.worker_1_id).map(w => (
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
