import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Users, UserPlus, DollarSign, AlertCircle, ChevronRight, User, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';

export default function Dashboard() {
    const queryClient = useQueryClient();
    const [modalType, setModalType] = useState(null); // 'workers' | 'passers' | 'revenue' | null
    const [selectedInfoPerson, setSelectedInfoPerson] = useState(null);

    // Add Person Flow State
    const [addPersonType, setAddPersonType] = useState(null); // 'worker' | 'passer' | null
    const [selectedCell, setSelectedCell] = useState(null);

    const { data: stats } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            // Mock aggregations
            const { data: workers } = await supabase.from('workers').select('*');
            const { data: passers } = await supabase.from('passers').select('*');
            const { data: cells } = await supabase.from('cells').select('*');

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
            const allPending = [
                ...pendingWorkers.map(w => ({ ...w, type: 'Trabalhador', cell: cellMap[w.cell_id] })),
                ...pendingPassers.map(p => ({ ...p, type: 'Passante', cell: cellMap[p.cell_id] }))
            ];

            return {
                totalWorkers,
                totalPassers,
                totalRevenue,
                pendingPayments: allPending,
                allWorkers: workers,
                allPassers: passers,
                cells: cells || []
            };
        }
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
            return supabase.from(table).insert({ ...data, cell_id: selectedCell.id, church_id: 'church-1' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['dashboardStats']);
            setAddPersonType(null);
            setSelectedCell(null);
            toast.success(`${addPersonType === 'worker' ? 'Trabalhador' : 'Passante'} adicionado com sucesso!`);
        },
        onError: () => toast.error('Erro ao adicionar.')
    });

    const handlePersonSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            surname: formData.get('surname'),
            phone: formData.get('phone'),
            photo_url: formData.get('photo_url'),
            payment_status: formData.get('payment_status'),
            payment_amount: parseFloat(formData.get('payment_amount')),
            ...(addPersonType === 'worker' ? { is_room_leader: formData.get('is_room_leader') === 'on' } : {})
        };
        addPersonMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-slate-500">Visão geral do evento.</p>
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

            {/* Modals */}
            <Modal isOpen={modalType === 'workers'} onClose={() => setModalType(null)} title="Todos os Trabalhadores">
                <div className="overflow-y-auto max-h-[60vh]">
                    <div className="space-y-2">
                        {stats?.allWorkers?.map(w => (
                            <div key={w.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">{w.name} {w.surname}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${w.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {w.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                    </span>
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Pending Payments Section */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Pagamentos Pendentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats?.pendingPayments?.length === 0 ? (
                                <p className="text-sm text-slate-500">Nenhum pagamento pendente.</p>
                            ) : (
                                stats?.pendingPayments?.map((person) => (
                                    <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 bg-orange-100 rounded-full">
                                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-900">{person.name} {person.surname}</p>
                                                    {person.cell && (
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: person.cell.card_color }}></span>
                                                            {person.cell.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{person.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-medium text-slate-900">R$ {person.payment_amount?.toFixed(2)}</span>
                                            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">Pendente</span>
                                            <button
                                                onClick={() => setSelectedInfoPerson(person)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="col-span-3">
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
            </div>
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
                            <label className="block text-sm font-medium text-gray-700">Foto URL</label>
                            <input name="photo_url" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-xs" placeholder="https://..." />
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

                        {addPersonType === 'worker' && (
                            <div className="flex items-center">
                                <input name="is_room_leader" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label className="ml-2 block text-sm text-gray-900">Líder de Quarto?</label>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setSelectedCell(null)} className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                                Voltar
                            </button>
                            <button type="submit" className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]">
                                Salvar
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <WorkerInfoModal
                worker={selectedInfoPerson}
                cells={stats?.cells}
                isOpen={!!selectedInfoPerson}
                onClose={() => setSelectedInfoPerson(null)}
            />
        </div>
    );
}
