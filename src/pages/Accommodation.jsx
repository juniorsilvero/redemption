import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Plus, User, Trash2, Edit, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateRoomPDF } from '../utils/pdfGenerator';


export default function Accommodation() {
    const { churchId } = useAuth();
    const queryClient = useQueryClient();
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    // ... rest of state stays same
    const [editingRoom, setEditingRoom] = useState(null);
    const [viewingLeader, setViewingLeader] = useState(null);
    const [assigningPasser, setAssigningPasser] = useState(null);
    const [selectedLeaderIds, setSelectedLeaderIds] = useState([]);

    // Data Fetching
    const { data: rooms } = useQuery({
        queryKey: ['rooms', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('rooms').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });

    const { data: passers } = useQuery({
        queryKey: ['passers', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('passers').select('*').eq('church_id', churchId);
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

    const { data: cells } = useQuery({
        queryKey: ['cells', churchId],
        queryFn: async () => {
            const { data } = await supabase.from('cells').select('*').eq('church_id', churchId);
            return data || [];
        },
        enabled: !!churchId
    });


    const cellMap = (cells || []).reduce((acc, cell) => {
        acc[cell.id] = cell;
        return acc;
    }, {});

    // Mutations
    const createRoomMutation = useMutation({
        mutationFn: async (roomData) => {
            if (roomData.id) {
                return supabase.from('rooms').update(roomData).eq('id', roomData.id);
            }
            return supabase.from('rooms').insert({ ...roomData, church_id: 'church-1' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rooms']);
            setIsRoomModalOpen(false);
            setEditingRoom(null);
            setSelectedLeaderIds([]);
            toast.success(editingRoom ? 'Quarto atualizado!' : 'Quarto criado com sucesso!');
        }
    });

    const assignPasserMutation = useMutation({
        mutationFn: async ({ passerId, roomId }) => {
            const { error } = await supabase.from('passers').update({ room_id: roomId }).eq('id', passerId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['passers']);
            toast.success('Passante alocado');
        }
    });

    const unassignPasserMutation = useMutation({
        mutationFn: async ({ passerId }) => {
            const { error } = await supabase.from('passers').update({ room_id: null }).eq('id', passerId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['passers']);
            toast.success('Passante removido do quarto');
        }
    });

    // Derived state
    const unassignedPassers = passers?.filter(p => !p.room_id) || [];

    // Handlers
    const openModal = (room = null) => {
        setEditingRoom(room);
        setSelectedLeaderIds(room?.room_leader_ids || []);
        setIsRoomModalOpen(true);
    };

    const handleSaveRoom = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            capacity: parseInt(formData.get('capacity')),
            gender: formData.get('gender'),
            room_leader_ids: selectedLeaderIds
        };

        if (editingRoom) {
            data.id = editingRoom.id;
        } else {
            // New room defaults
            if (!editingRoom) data.room_leader_ids = selectedLeaderIds;
        }

        createRoomMutation.mutate(data);
    };

    const handleAddLeader = (workerId) => {
        if (workerId && !selectedLeaderIds.includes(workerId)) {
            setSelectedLeaderIds([...selectedLeaderIds, workerId]);
        }
    };

    const handleRemoveLeader = (workerId) => {
        setSelectedLeaderIds(selectedLeaderIds.filter(id => id !== workerId));
    };

    const handleDragStart = (e, passerId) => {
        e.dataTransfer.setData('passerId', passerId);
    };

    const handleDrop = (e, roomId) => {
        e.preventDefault();
        const passerId = e.dataTransfer.getData('passerId');
        if (passerId) {
            assignPasserToRoom(passerId, roomId);
        }
    };

    const assignPasserToRoom = (passerId, roomId) => {
        // Check capacity
        const room = rooms.find(r => r.id === roomId);
        const currentOccupancy = passers.filter(p => p.room_id === roomId).length;

        if (currentOccupancy >= room.capacity) {
            toast.error('Quarto lotado!');
            return;
        }

        assignPasserMutation.mutate({ passerId, roomId });
        setAssigningPasser(null); // Close modal if open
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-8rem)]">
            {/* Rooms Grid */}
            <div className="flex-1 w-full lg:overflow-y-auto pr-2 order-2 lg:order-1">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acomodações</h1>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        <Plus className="h-4 w-4" />
                        Novo Quarto
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    {rooms?.map(room => {
                        const occupants = passers?.filter(p => p.room_id === room.id) || [];
                        const occupancyPercent = (occupants.length / room.capacity) * 100;
                        const isFull = occupants.length >= room.capacity;

                        return (
                            <Card
                                key={room.id}
                                className={`transition-colors ${isFull ? 'bg-slate-50' : 'bg-white'}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, room.id)}
                            >
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{room.name}</CardTitle>
                                        <button onClick={() => openModal(room)} className="text-slate-400 hover:text-indigo-600" title="Editar Quarto">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => generateRoomPDF(room, room.room_leader_ids.map(id => workers.find(w => w.id === id)).filter(Boolean), passers.filter(p => p.room_id === room.id), cellMap)}
                                            className="text-slate-400 hover:text-green-600"
                                            title="Gerar PDF"
                                        >
                                            <FileText className="h-4 w-4" />
                                        </button>

                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${room.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                        {room.gender === 'male' ? 'Masculino' : 'Feminino'}
                                    </span>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Progress Bar */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">Ocupação</span>
                                                <span className={`font-medium ${isFull ? 'text-red-500' : 'text-slate-700'}`}>
                                                    {occupants.length} / {room.capacity}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${isFull ? 'bg-red-500' : 'bg-indigo-600'}`}
                                                    style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Occupants List */}
                                        <div className="min-h-[100px] border rounded-md p-2 bg-slate-50 space-y-2">
                                            {occupants.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">Arraste passantes para cá</p>
                                            ) : (
                                                occupants.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm text-sm">
                                                        <span className="truncate">{p.name} {p.surname}</span>
                                                        <button
                                                            onClick={() => unassignPasserMutation.mutate({ passerId: p.id })}
                                                            className="text-slate-400 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Leaders Display */}
                                        {room.room_leader_ids?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                <p className="text-xs font-semibold text-slate-500 mb-1">Líderes:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {room.room_leader_ids.map(lid => {
                                                        const leader = workers?.find(w => w.id === lid);
                                                        return (
                                                            <button
                                                                key={lid}
                                                                onClick={() => setViewingLeader(leader)}
                                                                className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                            >
                                                                {leader?.name || 'Desconhecido'}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Unassigned Sidebar */}
            <div className="w-full lg:w-80 bg-white border-l border-slate-200 p-4 h-auto lg:h-full lg:overflow-y-auto order-1 lg:order-2 mb-6 lg:mb-0">
                <h2 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
                    <span>Não Alocados</span>
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{unassignedPassers.length}</span>
                </h2>
                <div className="space-y-2">
                    {unassignedPassers.map(passer => (
                        <div
                            key={passer.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, passer.id)}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-move hover:shadow-md transition-shadow active:cursor-grabbing"
                        >
                            <div className="bg-white p-2 rounded-full border border-slate-200">
                                <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{passer.name} {passer.surname}</p>
                                <p className="text-xs text-slate-500 truncate">Pendente: R$ {passer.payment_amount.toFixed(2)}</p>
                            </div>
                            {/* Mobile Assign Button */}
                            <button
                                onClick={() => setAssigningPasser(passer)}
                                className="lg:hidden text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium hover:bg-indigo-200 active:bg-indigo-300"
                            >
                                Alocar
                            </button>
                        </div>
                    ))}
                    {unassignedPassers.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">Todos alocados!</p>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                title={editingRoom ? "Editar Quarto" : "Novo Quarto"}
            >
                <form onSubmit={handleSaveRoom} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome do Quarto</label>
                        <input name="name" defaultValue={editingRoom?.name} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="Ex: Alojamento A" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Capacidade</label>
                        <input name="capacity" type="number" defaultValue={editingRoom?.capacity} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="10" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Gênero</label>
                        <select name="gender" defaultValue={editingRoom?.gender} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                        </select>
                    </div>

                    {/* Leaders Management */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Líderes de Quarto</label>
                        <div className="mt-1 space-y-2">
                            <select
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm"
                                onChange={(e) => {
                                    handleAddLeader(e.target.value);
                                    e.target.value = "";
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Adicionar Líder...</option>
                                {workers?.map(w => (
                                    <option key={w.id} value={w.id} disabled={selectedLeaderIds.includes(w.id)}>
                                        {w.name} {w.surname}
                                    </option>
                                ))}
                            </select>

                            <div className="flex flex-wrap gap-2">
                                {selectedLeaderIds.map(id => {
                                    const worker = workers?.find(w => w.id === id);
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                            {worker?.name || id}
                                            <button type="button" onClick={() => handleRemoveLeader(id)} className="text-indigo-600 hover:text-indigo-900">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button type="submit" className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-start-2">
                            {editingRoom ? "Salvar" : "Criar"}
                        </button>
                        <button type="button" onClick={() => setIsRoomModalOpen(false)} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0">
                            Cancelar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Leader Details Modal */}
            <Modal
                isOpen={!!viewingLeader}
                onClose={() => setViewingLeader(null)}
                title="Detalhes do Líder"
            >
                {viewingLeader && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                                {viewingLeader.photo_url ? (
                                    <img src={viewingLeader.photo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-8 w-8" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{viewingLeader.name} {viewingLeader.surname}</h3>
                                <p className="text-sm text-slate-500">{viewingLeader.phone || 'Sem telefone'}</p>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Célula</p>
                            <div className="flex items-center gap-2">
                                {cellMap[viewingLeader.cell_id] ? (
                                    <>
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cellMap[viewingLeader.cell_id].card_color }}></div>
                                        <p className="text-sm font-medium text-slate-900">{cellMap[viewingLeader.cell_id].name}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Sem célula vinculada</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => setViewingLeader(null)}
                                className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Assignment Modal for Mobile */}
            <Modal
                isOpen={!!assigningPasser}
                onClose={() => setAssigningPasser(null)}
                title="Alocar Passante"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Escolha um quarto para {assigningPasser?.name}:
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                        {rooms?.map(room => {
                            const occupants = passers?.filter(p => p.room_id === room.id) || [];
                            const isFull = occupants.length >= room.capacity;
                            return (
                                <button
                                    key={room.id}
                                    disabled={isFull}
                                    onClick={() => assignPasserToRoom(assigningPasser.id, room.id)}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${isFull ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500'}`}
                                >
                                    <div>
                                        <p className="font-semibold text-slate-900">{room.name}</p>
                                        <p className="text-xs text-slate-500">{room.gender === 'male' ? 'Masculino' : 'Feminino'}</p>
                                    </div>
                                    <div className="text-xs font-medium text-slate-600">
                                        {occupants.length}/{room.capacity}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </Modal>


        </div>
    );
}
