import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Users, UserPlus, Trash2, Edit2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { WorkerInfoModal } from '../components/ui/WorkerInfoModal';


export default function CellDetails() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);

    // Passer State
    const [isPasserModalOpen, setIsPasserModalOpen] = useState(false);
    const [editingPasser, setEditingPasser] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedInfoPerson, setSelectedInfoPerson] = useState(null);



    // Cell Data
    const { data: cell } = useQuery({
        queryKey: ['cell', id],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*').eq('id', id);
            return data?.[0];
        }
    });

    // Workers Data
    const { data: workers } = useQuery({
        queryKey: ['cellWorkers', id],
        queryFn: async () => {
            const { data } = await supabase.from('workers').select('*').eq('cell_id', id);
            return data || [];
        }
    });

    // Passers Data
    const { data: passers } = useQuery({
        queryKey: ['cellPassers', id],
        queryFn: async () => {
            const { data } = await supabase.from('passers').select('*').eq('cell_id', id);
            return data || [];
        }
    });

    // Calculations
    const totalPaid = (workers?.filter(w => w.payment_status === 'paid').reduce((a, b) => a + b.payment_amount, 0) || 0) +
        (passers?.filter(p => p.payment_status === 'paid').reduce((a, b) => a + b.payment_amount, 0) || 0);

    const totalPending = (workers?.filter(w => w.payment_status === 'pending').reduce((a, b) => a + b.payment_amount, 0) || 0) +
        (passers?.filter(p => p.payment_status === 'pending').reduce((a, b) => a + b.payment_amount, 0) || 0);


    // Mutations (Mock)
    const addWorkerMutation = useMutation({
        mutationFn: async (newWorker) => {
            if (!newWorker.id && editingWorker?.id) return supabase.from('workers').update(newWorker).eq('id', editingWorker.id);
            return supabase.from('workers').insert({ ...newWorker, cell_id: id, church_id: 'church-1' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellWorkers', id]);
            setIsWorkerModalOpen(false);
            setEditingWorker(null);
            setIsUploading(false);
            toast.success(editingWorker ? 'Trabalhador atualizado' : 'Trabalhador adicionado');
        }

    });

    const addPasserMutation = useMutation({
        mutationFn: async (newPasser) => {
            if (!newPasser.id && editingPasser?.id) return supabase.from('passers').update(newPasser).eq('id', editingPasser.id);
            return supabase.from('passers').insert({ ...newPasser, cell_id: id, church_id: 'church-1' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellPassers', id]);
            setIsPasserModalOpen(false);
            setEditingPasser(null);
            setIsUploading(false);
            toast.success(editingPasser ? 'Passante atualizado' : 'Passante adicionado');
        }

    });

    const togglePaymentMutation = useMutation({
        mutationFn: async ({ id, type, currentStatus }) => {
            const table = type === 'worker' ? 'workers' : 'passers';
            const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
            return supabase.from(table).update({ payment_status: newStatus }).eq('id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellWorkers', id]);
            queryClient.invalidateQueries(['cellPassers', id]);
            queryClient.invalidateQueries(['dashboardStats']);
            toast.success('Status de pagamento atualizado');
        }
    });

    const deletePasserMutation = useMutation({
        mutationFn: async (passerId) => {
            return supabase.from('passers').delete().eq('id', passerId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellPassers', id]);
            queryClient.invalidateQueries(['dashboardStats']);
            toast.success('Passante excluído');
        },
        onError: () => toast.error('Erro ao excluir passante')
    });

    const deleteAllPassersMutation = useMutation({
        mutationFn: async () => {
            return supabase.from('passers').delete().eq('cell_id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cellPassers', id]);
            queryClient.invalidateQueries(['dashboardStats']);
            toast.success('Todos os passantes foram excluídos');
        },
        onError: () => toast.error('Erro ao excluir todos os passantes')
    });


    // Very simplified Form handling
    const handleWorkerSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const photoFile = formData.get('photo');
        let photo_url = editingWorker?.photo_url || '';

        setIsUploading(true);
        try {
            if (photoFile && photoFile.size > 0) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `workers/${fileName}`;

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
                is_room_leader: formData.get('is_room_leader') === 'on'
            };
            addWorkerMutation.mutate(data);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Erro ao fazer upload da foto.');
            setIsUploading(false);
        }
    };


    const handlePasserSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const photoFile = formData.get('photo');
        let photo_url = editingPasser?.photo_url || '';

        setIsUploading(true);
        try {
            if (photoFile && photoFile.size > 0) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `passers/${fileName}`;

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
                birth_date: formData.get('birth_date') || null,
                age: formData.get('age') ? parseInt(formData.get('age')) : null,
                address: formData.get('address'),
                family_contact_1: formData.get('family_contact_1'),
                family_contact_2: formData.get('family_contact_2'),
                food_restrictions: formData.get('food_restrictions'),
                controlled_medication: formData.get('controlled_medication'),
                physical_restrictions: formData.get('physical_restrictions'),
                responsible_worker_id: formData.get('responsible_worker_id') || null
            };

            addPasserMutation.mutate(data);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Erro ao fazer upload da foto.');
            setIsUploading(false);
        }
    };


    const handleDeletePasser = (passerId) => {
        if (window.confirm('Tem certeza que deseja excluir determinado passante?')) {
            deletePasserMutation.mutate(passerId);
        }
    };

    const handleDeleteAllPassers = () => {
        const password = window.prompt('Para excluir TODOS os passantes desta célula, digite a senha de confirmação:');
        if (password === 'gpredencao') {
            deleteAllPassersMutation.mutate();
        } else if (password !== null) {
            toast.error('Senha incorreta!');
        }
    };

    if (!cell) return <div>Carregando...</div>;


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cell.card_color }}></span>
                        {cell.name}
                    </h1>
                    <p className="text-slate-500">Gestão de membros e pagamentos.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditingWorker(null); setIsWorkerModalOpen(true); }}
                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        <UserPlus className="h-4 w-4" />
                        Novo Trabalhador
                    </button>
                    <button
                        onClick={() => { setEditingPasser(null); setIsPasserModalOpen(true); }}
                        className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                    >
                        <UserPlus className="h-4 w-4" />
                        Novo Passante
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pago</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">R$ {totalPaid.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pendente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">R$ {totalPending.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Workers Column */}
                <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <CardTitle>Trabalhadores <span className="ml-2 inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/10">{workers?.length || 0}</span></CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {workers?.map((person) => (
                                <div key={person.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="h-10 w-10 flex-shrink-0">
                                            {person.photo_url ? (
                                                <img className="h-10 w-10 rounded-full object-cover shadow-sm" src={person.photo_url} alt="" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                {person.name} {person.surname}
                                                {person.is_room_leader && (
                                                    <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                                        Líder
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500">{person.phone || 'Sem telefone'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <button
                                                onClick={() => togglePaymentMutation.mutate({ id: person.id, type: 'worker', currentStatus: person.payment_status })}
                                                className={cn(
                                                    "text-xs font-medium px-2 py-1 rounded-md transition-all border",
                                                    person.payment_status === 'paid'
                                                        ? "text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
                                                        : "text-red-700 bg-red-50 border-red-100 hover:bg-red-100"
                                                )}
                                            >
                                                {person.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                            </button>
                                            <p className="text-xs text-slate-500">R$ {person.payment_amount.toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedInfoPerson(person)}
                                            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => { setEditingWorker(person); setIsWorkerModalOpen(true); }}
                                            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Passers Column */}
                {/* Passers Column */}
                <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50 flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm">Passantes <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">{passers?.length || 0}</span></CardTitle>
                        {passers?.length > 0 && (
                            <button
                                onClick={handleDeleteAllPassers}
                                className="text-[10px] font-bold uppercase text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors border border-red-100"
                            >
                                Excluir Todos
                            </button>
                        )}
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {passers?.map((person) => (
                                <div key={person.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="h-10 w-10 flex-shrink-0">
                                            {person.photo_url ? (
                                                <img className="h-10 w-10 rounded-full object-cover shadow-sm" src={person.photo_url} alt="" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {person.name} {person.surname}
                                            </p>
                                            <p className="text-xs text-slate-500">{person.phone || 'Sem telefone'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <button
                                                onClick={() => togglePaymentMutation.mutate({ id: person.id, type: 'passer', currentStatus: person.payment_status })}
                                                className={cn(
                                                    "text-xs font-medium px-2 py-1 rounded-md transition-all border",
                                                    person.payment_status === 'paid'
                                                        ? "text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
                                                        : "text-red-700 bg-red-50 border-red-100 hover:bg-red-100"
                                                )}
                                            >
                                                {person.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                            </button>
                                            <p className="text-xs text-slate-500 mt-1">R$ {person.payment_amount.toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedInfoPerson(person)}
                                            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => { setEditingPasser(person); setIsPasserModalOpen(true); }}
                                            className="p-1 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePasser(person.id)}
                                            className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>

                                    </div>

                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal for Worker */}
            <Modal
                isOpen={isWorkerModalOpen}
                onClose={() => setIsWorkerModalOpen(false)}
                title={editingWorker ? "Editar Trabalhador" : "Adicionar Trabalhador"}
            >
                <form onSubmit={handleWorkerSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome</label>
                            <input name="name" defaultValue={editingWorker?.name} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
                            <input name="surname" defaultValue={editingWorker?.surname} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
                        <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        {editingWorker?.photo_url && (
                            <p className="mt-1 text-[10px] text-slate-400">Já possui foto. Selecione nova para trocar.</p>
                        )}
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700">Telefone</label>
                        <input name="phone" defaultValue={editingWorker?.phone} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                            <input name="payment_amount" type="number" step="0.01" defaultValue={editingWorker?.payment_amount || 170.00} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select name="payment_status" defaultValue={editingWorker?.payment_status || 'pending'} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <input name="is_room_leader" type="checkbox" defaultChecked={editingWorker?.is_room_leader} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <label className="ml-2 block text-sm text-gray-900">Líder de Quarto?</label>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button type="submit" disabled={isUploading} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-start-2 disabled:opacity-50">
                            {isUploading ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button type="button" onClick={() => setIsWorkerModalOpen(false)} disabled={isUploading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0">
                            Cancelar
                        </button>
                    </div>

                </form>
            </Modal>

            {/* Modal for Passer */}
            <Modal
                isOpen={isPasserModalOpen}
                onClose={() => setIsPasserModalOpen(false)}
                title={editingPasser ? "Editar Passante" : "Adicionar Passante"}
            >
                <form onSubmit={handlePasserSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome</label>
                            <input name="name" defaultValue={editingPasser?.name} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
                            <input name="surname" defaultValue={editingPasser?.surname} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
                        <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        {editingPasser?.photo_url && (
                            <p className="mt-1 text-[10px] text-slate-400">Já possui foto. Selecione nova para trocar.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Telefone</label>
                        <input name="phone" defaultValue={editingPasser?.phone} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                            <input name="payment_amount" type="number" step="0.01" defaultValue={editingPasser?.payment_amount || 290.00} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status Pagamento</label>
                            <select name="payment_status" defaultValue={editingPasser?.payment_status || 'pending'} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                                <input name="birth_date" type="date" defaultValue={editingPasser?.birth_date} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Idade</label>
                                <input name="age" type="number" defaultValue={editingPasser?.age} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço</label>
                            <textarea name="address" rows="2" defaultValue={editingPasser?.address} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm"></textarea>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contato Familiar 1</label>
                                <input name="family_contact_1" defaultValue={editingPasser?.family_contact_1} placeholder="(número) + parentesco" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contato Familiar 2</label>
                                <input name="family_contact_2" defaultValue={editingPasser?.family_contact_2} placeholder="(número) + parentesco" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Responsável (Trabalhador)</label>
                                <select name="responsible_worker_id" defaultValue={editingPasser?.responsible_worker_id} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm">
                                    <option value="">Selecione um responsável</option>
                                    {workers?.map(worker => (
                                        <option key={worker.id} value={worker.id}>
                                            {worker.name} {worker.surname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Restrição Alimentar ou Alergia?</label>

                                <input name="food_restrictions" defaultValue={editingPasser?.food_restrictions} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Toma Medicamento Controlado?</label>
                                <input name="controlled_medication" defaultValue={editingPasser?.controlled_medication} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Restrição ou Deficiência Física?</label>
                                <input name="physical_restrictions" defaultValue={editingPasser?.physical_restrictions} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button type="submit" disabled={isUploading} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-start-2 disabled:opacity-50">
                            {isUploading ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button type="button" onClick={() => setIsPasserModalOpen(false)} disabled={isUploading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0">
                            Cancelar
                        </button>
                    </div>

                </form>
            </Modal>

            <WorkerInfoModal
                worker={selectedInfoPerson}
                cells={cell ? [cell] : []}

                allWorkers={workers}
                allPassers={passers}
                isOpen={!!selectedInfoPerson}
                onClose={() => setSelectedInfoPerson(null)}
            />

        </div>

    );
}
