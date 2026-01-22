import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Users, UserPlus, DollarSign, AlertCircle, ChevronRight, User, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';
import { GlobalSearch } from '../components/ui/GlobalSearch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
    const { churchId } = useAuth();
    const { genderFilter } = useFilter();
    const queryClient = useQueryClient();
    const [modalType, setModalType] = useState(null); // 'workers' | 'passers' | 'revenue' | 'pending' | 'addReport' | null
    const [selectedInfoPerson, setSelectedInfoPerson] = useState(null);
    const [selectedReportEvent, setSelectedReportEvent] = useState(null);

    // Add Report State
    const [isAddingReport, setIsAddingReport] = useState(false);

    // Add Person Flow State
    const [addPersonType, setAddPersonType] = useState(null); // 'worker' | 'passer' | null
    const [selectedCell, setSelectedCell] = useState(null);
    const [isUploading, setIsUploading] = useState(false);


    const { data: stats } = useQuery({
        queryKey: ['dashboardStats', churchId, genderFilter],
        queryFn: async () => {
            // Get cells first, filtered by gender
            let cellsQuery = supabase.from('cells').select('*').eq('church_id', churchId);
            if (genderFilter !== 'all') {
                cellsQuery = cellsQuery.eq('gender', genderFilter);
            }
            const { data: cells } = await cellsQuery;
            const cellIds = cells?.map(c => c.id) || [];

            // Filter workers and passers by cell IDs
            const { data: workers } = cellIds.length > 0
                ? await supabase.from('workers').select('*').eq('church_id', churchId).in('cell_id', cellIds)
                : { data: [] };
            const { data: passers } = cellIds.length > 0
                ? await supabase.from('passers').select('*').eq('church_id', churchId).in('cell_id', cellIds)
                : { data: [] };

            const totalWorkers = workers?.length || 0;
            const totalPassers = passers?.length || 0;

            // Calculate revenue (paid only)
            const workerRevenue = workers?.reduce((acc, curr) => curr.payment_status === 'paid' ? acc + curr.payment_amount : acc, 0) || 0;
            const passerRevenue = passers?.reduce((acc, curr) => curr.payment_status === 'paid' ? acc + curr.payment_amount : acc, 0) || 0;
            const totalRevenue = workerRevenue + passerRevenue;

            // Create lookup map for cells
            const cellMap = (cells || []).reduce((acc, cell) => {
                acc[cell.id] = cell;
                return acc;
            }, {});

            // Pending payments with Cell Data
            const pendingWorkers = workers?.filter(w => w.payment_status === 'pending') || [];
            const pendingPassers = passers?.filter(p => p.payment_status === 'pending') || [];

            // Calculate total pending value
            const pendingValueWorker = pendingWorkers.reduce((acc, curr) => acc + (curr.payment_amount || 0), 0);
            const pendingValuePasser = pendingPassers.reduce((acc, curr) => acc + (curr.payment_amount || 0), 0);
            const totalPendingValue = pendingValueWorker + pendingValuePasser;

            const allPending = [
                ...pendingWorkers.map(w => ({ ...w, type: 'Trabalhador', cell: cellMap[w.cell_id] })),
                ...pendingPassers.map(p => ({ ...p, type: 'Passante', cell: cellMap[p.cell_id] }))
            ];

            // Calculate ranking: Number of passers per worker
            const workerPassersMap = (passers || []).reduce((acc, p) => {
                if (p.responsible_worker_id) {
                    acc[p.responsible_worker_id] = (acc[p.responsible_worker_id] || 0) + 1;
                }
                return acc;
            }, {});

            const workersWithRanking = (workers || []).map(w => ({
                ...w,
                passers_count: workerPassersMap[w.id] || 0
            })).sort((a, b) => b.passers_count - a.passers_count);

            return {
                totalWorkers,
                totalPassers,
                totalRevenue,
                totalPendingValue,
                pendingPayments: allPending,
                allWorkers: workersWithRanking,
                allPassers: passers,
                cells: cells || []
            };

        },
        enabled: !!churchId
    });


    const kpiCards = [
        {
            title: 'Total Trabalhadores',
            value: stats?.totalWorkers || 0,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            action: () => setModalType('workers')
        },
        {
            title: 'Total Passantes',
            value: stats?.totalPassers || 0,
            icon: UserPlus,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            action: () => setModalType('passers')
        },
        {
            title: 'Receita Total',
            value: `R$ ${stats?.totalRevenue?.toFixed(2) || '0.00'}`,
            icon: DollarSign,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100',
            action: () => setModalType('revenue')
        }
    ];

    const addPersonMutation = useMutation({
        mutationFn: async (data) => {
            const table = addPersonType === 'worker' ? 'workers' : 'passers';
            return supabase.from(table).insert({ ...data, cell_id: selectedCell.id, church_id: churchId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['dashboardStats']);
            setAddPersonType(null);
            setSelectedCell(null);
            setIsUploading(false);
            toast.success(`${addPersonType === 'worker' ? 'Trabalhador' : 'Passante'} adicionado com sucesso!`);
        },

        onError: () => toast.error('Erro ao adicionar.')
    });

    const handlePersonSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const photoFile = formData.get('photo');
        let photo_url = '';

        setIsUploading(true);
        try {
            if (photoFile && photoFile.size > 0) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${addPersonType}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(filePath, photoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(filePath);

                photo_url = publicUrl;
            }

            const data = {
                name: formData.get('name'),
                surname: formData.get('surname'),
                phone: formData.get('phone'),
                photo_url: photo_url,
                payment_status: formData.get('payment_status'),
                payment_amount: parseFloat(formData.get('payment_amount')),
                ...(addPersonType === 'worker' ? {
                    is_room_leader: formData.get('is_room_leader') === 'on'
                } : {
                    birth_date: formData.get('birth_date') || null,
                    age: formData.get('age') ? parseInt(formData.get('age')) : null,
                    address: formData.get('address'),
                    family_contact_1: formData.get('family_contact_1'),
                    family_contact_2: formData.get('family_contact_2'),
                    food_restrictions: formData.get('food_restrictions'),
                    controlled_medication: formData.get('controlled_medication'),
                    physical_restrictions: formData.get('physical_restrictions'),
                    responsible_worker_id: formData.get('responsible_worker_id') || null
                })
            };

            addPersonMutation.mutate(data);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Erro ao fazer upload da foto.');
            setIsUploading(false);
        }
    };

    // Add Report Mutation
    const addReportMutation = useMutation({
        mutationFn: async (data) => {
            return supabase.from('historical_events').insert({ ...data, church_id: churchId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['historicalStats', churchId]);
            queryClient.invalidateQueries(['dashboardStats']); // Also refresh main stats if relevant
            setModalType(null);
            setIsAddingReport(false);
            toast.success('Relatório adicionado com sucesso!');
        },
        onError: (error) => {
            console.error('Error adding report:', error);
            toast.error('Erro ao adicionar relatório: ' + (error.message || 'Erro desconhecido'));
        }
    });

    const handleReportSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const genderValue = formData.get('report_gender') === 'male' ? 'Homens' : 'Mulheres';

        const data = {
            name: formData.get('name'),
            event_date: formData.get('event_date'),
            gender: genderValue,

            total_workers: parseInt(formData.get('total_workers')) || 0,
            total_passers: parseInt(formData.get('total_passers')) || 0,
            total_received: parseFloat(formData.get('total_received')) || 0,
            total_pending: parseFloat(formData.get('total_pending')) || 0,
        };
        addReportMutation.mutate(data);
    };

    // Fetch Historical Data for Reports
    const { data: historicalStats } = useQuery({
        queryKey: ['historicalStats', churchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('historical_events')
                .select('*')
                .eq('church_id', churchId)
                .order('event_date', { ascending: true });

            if (error) {
                console.error('Error fetching history:', error);
                return [];
            }
            return data;
        },
        enabled: !!churchId
    });

    // Process data for charts
    // We consolidate potential multiple entries per day/event name to render on chart
    const processedChartData = (historicalStats || []).reduce((acc, event) => {
        const key = `${event.event_date}-${event.name}`;
        if (!acc[key]) {
            acc[key] = {
                name: event.name || format(new Date(event.event_date), 'MMM/yy', { locale: ptBR }),
                date: event.event_date,
                workers_male: 0,
                workers_female: 0,
                passers_male: 0,
                passers_female: 0,
                total: 0
            };
        }

        if (event.gender === 'Homens') {
            acc[key].workers_male += event.total_workers;
            acc[key].passers_male += event.total_passers;
        } else {
            acc[key].workers_female += event.total_workers;
            acc[key].passers_female += event.total_passers;
        }

        acc[key].total += (event.total_workers + event.total_passers);

        return acc;
    }, {});

    const chartData = Object.values(processedChartData).sort((a, b) => new Date(a.date) - new Date(b.date));


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Visão geral do evento.</p>
                </div>
                <GlobalSearch />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {kpiCards.map((card) => (
                    <Card key={card.title} onClick={card.action} className="cursor-pointer hover:shadow-md transition-all active:scale-95">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${card.bgColor}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions and Pending Cards Grid */}
            <div className="flex flex-col lg:grid lg:grid-cols-7 gap-4">
                {/* Quick Actions */}
                <Card className="order-1 lg:order-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <button
                            onClick={() => { setAddPersonType('worker'); setSelectedCell(null); }}
                            className="flex w-full items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-accent-hover)] transition-colors"
                        >
                            Adicionar Trabalhador
                        </button>
                        <button
                            onClick={() => { setAddPersonType('passer'); setSelectedCell(null); }}
                            className="flex w-full items-center justify-center rounded-[var(--radius-card)] bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                        >
                            Adicionar Passante
                        </button>
                        <Link to="/accommodation" className="flex w-full items-center justify-center rounded-[var(--radius-card)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-accent)] shadow-sm ring-1 ring-inset ring-[var(--color-accent)]/30 hover:bg-indigo-50 transition-colors">
                            Gerenciar Acomodações
                        </Link>
                    </CardContent>
                </Card>

                {/* Pending Payments Section - Summary Card */}
                <Card
                    className="order-2 lg:order-1 lg:col-span-4 cursor-pointer hover:shadow-md transition-all active:scale-95 group"
                    onClick={() => setModalType('pending')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-orange-700 transition-colors">Pagamentos Pendentes</CardTitle>
                        <div className="p-2 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">R$ {stats?.totalPendingValue?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats?.pendingPayments?.length || 0} pessoas pendentes. <span className="text-indigo-600 font-medium">Clique para ver detalhes.</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Reports Section (Bottom) */}
            <div className="grid lg:grid-cols-1 gap-6">
                <Card className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Relatório de Eventos</h3>
                                <p className="text-sm text-slate-500">Histórico de comparecimento</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/* Gender Filter */}
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 ml-auto sm:ml-0">
                                <Filter className="h-4 w-4" />
                                <span>Filtro: {genderFilter === 'all' ? 'Geral' : genderFilter === 'male' ? 'Homens' : 'Mulheres'}</span>
                            </div>

                            {/* Add Report Button */}
                            <button
                                onClick={() => setModalType('addReport')}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                            >
                                <span className="text-lg leading-none">+</span>
                                Add Relatório
                            </button>
                        </div>
                    </div>

                    <div className="h-[250px] md:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                {/* Workers Lines */}
                                {(genderFilter === 'all' || genderFilter === 'male') && (
                                    <Line
                                        type="monotone"
                                        dataKey="workers_male"
                                        name="Trabalhadores (H)"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                )}
                                {(genderFilter === 'all' || genderFilter === 'female') && (
                                    <Line
                                        type="monotone"
                                        dataKey="workers_female"
                                        name="Trabalhadores (M)"
                                        stroke="#ec4899"
                                        strokeWidth={2}
                                        dot={{ fill: '#ec4899', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                )}

                                {/* Passers Lines - Dashed to distinguish */}
                                {(genderFilter === 'all' || genderFilter === 'male') && (
                                    <Line
                                        type="monotone"
                                        dataKey="passers_male"
                                        name="Passantes (H)"
                                        stroke="#93c5fd"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ fill: '#93c5fd', r: 4 }}
                                    />
                                )}
                                {(genderFilter === 'all' || genderFilter === 'female') && (
                                    <Line
                                        type="monotone"
                                        dataKey="passers_female"
                                        name="Passantes (M)"
                                        stroke="#fbcfe8" // Light pink
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ fill: '#fbcfe8', r: 4 }}
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Historical Data - Desktop Table (hidden on mobile) */}
                    <div className="mt-8 overflow-x-auto hidden md:block">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Evento</th>
                                    <th className="px-4 py-3 font-semibold text-center">Data</th>
                                    <th className="px-4 py-3 font-semibold text-center">Gênero</th>
                                    <th className="px-4 py-3 font-semibold text-center text-blue-600">Trab.</th>
                                    <th className="px-4 py-3 font-semibold text-center text-pink-600">Pass.</th>
                                    <th className="px-4 py-3 font-semibold text-right text-emerald-600">Recebido</th>
                                    <th className="px-4 py-3 font-semibold text-right text-orange-600">Pendente</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historicalStats?.map((event, idx) => (
                                    <tr key={event.id || idx} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedReportEvent(event)}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{event.name}</td>
                                        <td className="px-4 py-3 text-center text-slate-500">{format(new Date(event.event_date), 'dd/MM/yyyy')}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${event.gender === 'Homens' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                                {event.gender || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-slate-700">{event.total_workers}</td>
                                        <td className="px-4 py-3 text-center font-medium text-slate-700">{event.total_passers}</td>
                                        <td className="px-4 py-3 text-right font-medium text-emerald-600">R$ {event.total_received?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-orange-600">R$ {event.total_pending?.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {(!historicalStats || historicalStats.length === 0) && (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-500 italic">
                                            Nenhum histórico de evento encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Historical Data - Mobile Card List (hidden on desktop) */}
                    <div className="mt-6 space-y-3 md:hidden">
                        {historicalStats?.map((event, idx) => (
                            <button
                                key={event.id || idx}
                                onClick={() => setSelectedReportEvent(event)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 active:scale-[0.98] transition-all text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${event.gender === 'Homens' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                                        <Calendar className={`h-4 w-4 ${event.gender === 'Homens' ? 'text-blue-600' : 'text-pink-600'}`} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{event.name}</p>
                                        <p className="text-xs text-slate-500">{format(new Date(event.event_date), 'dd/MM/yyyy')} • {event.gender}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </button>
                        ))}
                        {(!historicalStats || historicalStats.length === 0) && (
                            <div className="py-8 text-center text-slate-500 italic text-sm">
                                Nenhum histórico de evento encontrado.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Modals */}
            <Modal isOpen={modalType === 'workers'} onClose={() => setModalType(null)} title="Todos os Trabalhadores">
                <div className="overflow-y-auto max-h-[60vh]">
                    <div className="space-y-2">
                        {stats?.allWorkers?.map(w => (
                            <div key={w.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">{w.name} {w.surname}</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${w.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {w.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                        </span>
                                        {w.passers_count > 0 && (
                                            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none shrink-0">
                                                {w.passers_count} {w.passers_count === 1 ? 'passante' : 'passantes'}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setSelectedInfoPerson(w)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={modalType === 'passers'} onClose={() => setModalType(null)} title="Todos os Passantes">
                <div className="overflow-y-auto max-h-[60vh]">
                    <div className="space-y-2">
                        {stats?.allPassers?.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">{p.name} {p.surname}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {p.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                    </span>
                                    <button
                                        onClick={() => setSelectedInfoPerson(p)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={modalType === 'revenue'} onClose={() => setModalType(null)} title="Detalhamento de Receita (Pagos)" className="sm:max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh]">
                    {/* Paid Workers */}
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-3 sticky top-0 bg-white">Trabalhadores</h4>
                        <div className="space-y-2">
                            {stats?.allWorkers?.filter(w => w.payment_status === 'paid').map(w => (
                                <div key={w.id} className="flex justify-between items-center p-2 bg-indigo-50/50 rounded border border-indigo-100">
                                    <span className="text-sm text-slate-700">{w.name} {w.surname}</span>
                                    <span className="text-sm font-medium text-emerald-600">R$ {w.payment_amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Paid Passers */}
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-3 sticky top-0 bg-white">Passantes</h4>
                        <div className="space-y-2">
                            {stats?.allPassers?.filter(p => p.payment_status === 'paid').map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2 bg-emerald-50/50 rounded border border-emerald-100">
                                    <span className="text-sm text-slate-700">{p.name} {p.surname}</span>
                                    <span className="text-sm font-medium text-emerald-600">R$ {p.payment_amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={modalType === 'pending'} onClose={() => setModalType(null)} title="Pagamentos Pendentes">
                <div className="overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                        {stats?.pendingPayments?.length === 0 ? (
                            <p className="text-sm text-slate-500">Nenhum pagamento pendente.</p>
                        ) : (
                            stats?.pendingPayments?.map((person) => (
                                <div key={person.id} className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 sm:p-4 border rounded-lg bg-slate-50 items-center">
                                    <div className="p-2 bg-orange-100 rounded-full shrink-0">
                                        <AlertCircle className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <p className="text-sm font-bold text-slate-900">{person.name} {person.surname}</p>
                                            {person.cell && (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: person.cell.card_color }}></span>
                                                    {person.cell.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">{person.type}</p>

                                    </div>
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900 leading-none mb-1">R$ {person.payment_amount?.toFixed(2)}</p>
                                            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-inset ring-orange-600/20 uppercase tracking-tighter">Pendente</span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedInfoPerson(person)}
                                            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Add Person Logic Modal */}
            <Modal
                isOpen={!!addPersonType}
                onClose={() => { setAddPersonType(null); setSelectedCell(null); }}
                title={!selectedCell ? "Selecione a Célula" : `Adicionar ${addPersonType === 'worker' ? 'Trabalhador' : 'Passante'} em ${selectedCell.name}`}
            >
                {!selectedCell ? (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {stats?.cells?.map(cell => (
                            <button
                                key={cell.id}
                                onClick={() => setSelectedCell(cell)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-slate-700 group-hover:text-indigo-900">{cell.name}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <form onSubmit={handlePersonSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome</label>
                                <input name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
                                <input name="surname" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
                            <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input name="phone" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                                <input name="payment_amount" type="number" step="0.01" defaultValue={addPersonType === 'worker' ? 170.00 : 290.00} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select name="payment_status" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm">
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago</option>
                                </select>
                            </div>
                        </div>

                        {addPersonType === 'worker' ? (
                            <div className="flex items-center">
                                <input name="is_room_leader" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label className="ml-2 block text-sm text-gray-900">Líder de Quarto?</label>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                                        <input name="birth_date" type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Idade</label>
                                        <input name="age" type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                                    <textarea name="address" rows="2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm"></textarea>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Contato Familiar 1</label>
                                        <input name="family_contact_1" placeholder="(número) + parentesco" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Contato Familiar 2</label>
                                        <input name="family_contact_2" placeholder="(número) + parentesco" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Restrição Alimentar ou Alergia?</label>
                                        <input name="food_restrictions" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Toma Medicamento Controlado?</label>
                                        <input name="controlled_medication" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Restrição ou Deficiência Física?</label>
                                        <input name="physical_restrictions" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Responsável (Trabalhador)</label>
                                        <select name="responsible_worker_id" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm">
                                            <option value="">Selecione um responsável</option>
                                            {stats?.allWorkers?.filter(w => w.cell_id === selectedCell.id).map(worker => (
                                                <option key={worker.id} value={worker.id}>
                                                    {worker.name} {worker.surname}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}


                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setSelectedCell(null)} className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200" disabled={isUploading}>
                                Voltar
                            </button>
                            <button type="submit" className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50" disabled={isUploading}>
                                {isUploading ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>

                    </form>
                )}
            </Modal>

            {/* Add Report Modal */}
            <Modal
                isOpen={modalType === 'addReport'}
                onClose={() => setModalType(null)}
                title="Adicionar Relatório de Evento"
            >
                <form onSubmit={handleReportSubmit} className="space-y-4">

                    {/* Gender Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Relatório para:</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="report_gender" value="male" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" defaultChecked />
                                <span className="text-sm text-slate-700">Homens</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="report_gender" value="female" className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300" />
                                <span className="text-sm text-slate-700">Mulheres</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                        <input name="name" required placeholder="Ex: Encontro de Homens Fev/26" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data do Evento</label>
                        <input name="event_date" type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Trabalhadores</label>
                            <input name="total_workers" type="number" min="0" required placeholder="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Passantes</label>
                            <input name="total_passers" type="number" min="0" required placeholder="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-semibold text-slate-800">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Recebido (R$)</label>
                            <input name="total_received" type="number" step="0.01" min="0" required placeholder="0.00" className="mt-1 block w-full rounded-md border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Pendente (R$)</label>
                            <input name="total_pending" type="number" step="0.01" min="0" required placeholder="0.00" className="mt-1 block w-full rounded-md border-orange-200 bg-orange-50 text-orange-800 shadow-sm focus:border-orange-500 focus:ring-orange-500 border p-2 text-sm" />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={() => setModalType(null)} className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                            Cancelar
                        </button>
                        <button type="submit" disabled={addReportMutation.isPending} className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50">
                            {addReportMutation.isPending ? 'Salvando...' : 'Salvar Relatório'}
                        </button>
                    </div>
                </form>
            </Modal>


            <WorkerInfoModal
                worker={selectedInfoPerson}
                cells={stats?.cells}
                allWorkers={stats?.allWorkers}
                allPassers={stats?.allPassers}
                isOpen={!!selectedInfoPerson}
                onClose={() => setSelectedInfoPerson(null)}
            />

            {/* Event Details Modal (Mobile/Desktop) */}
            <Modal
                isOpen={!!selectedReportEvent}
                onClose={() => setSelectedReportEvent(null)}
                title={selectedReportEvent ? `${selectedReportEvent.name} - ${format(new Date(selectedReportEvent.event_date), 'dd/MM/yyyy')}` : 'Detalhes do Evento'}
            >
                {selectedReportEvent && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs font-medium text-slate-500 uppercase block mb-1">Total Recebido</span>
                                <span className="text-lg font-bold text-emerald-600">R$ {selectedReportEvent.total_received?.toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs font-medium text-slate-500 uppercase block mb-1">Total Pendente</span>
                                <span className="text-lg font-bold text-orange-600">R$ {selectedReportEvent.total_pending?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <h4 className="font-semibold text-slate-800 text-sm mb-2 pb-1 border-b">Estatísticas de Pessoas</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded">
                                        <span className="text-sm text-slate-600">Trabalhadores</span>
                                        <span className="font-medium text-slate-900">{selectedReportEvent.total_workers}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-pink-50/50 rounded">
                                        <span className="text-sm text-slate-600">Passantes</span>
                                        <span className="font-medium text-slate-900">{selectedReportEvent.total_passers}</span>
                                    </div>
                                    <div className="col-span-2 flex justify-between items-center p-2 bg-slate-100 rounded">
                                        <span className="text-sm font-semibold text-slate-700">Total Geral</span>
                                        <span className="font-bold text-slate-900">{selectedReportEvent.total_workers + selectedReportEvent.total_passers}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-800 text-sm mb-2 pb-1 border-b">Detalhes Adicionais</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Gênero</span>
                                        <span className="font-medium text-slate-700">{selectedReportEvent.gender}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Data</span>
                                        <span className="font-medium text-slate-700">{format(new Date(selectedReportEvent.event_date), 'dd/MM/yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setSelectedReportEvent(null)} className="w-full mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                            Fechar
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
