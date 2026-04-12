import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'react-hot-toast';
import { compressImage } from '../lib/utils';
import { CheckCircle2, Upload, Loader2, AlertCircle } from 'lucide-react';

export default function FichaCadastro() {
    const { cellId } = useParams();
    const [submitted, setSubmitted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);

    // Fetch cell data (public)
    const { data: cell, isLoading: cellLoading, isError: cellError } = useQuery({
        queryKey: ['public_cell', cellId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cells')
                .select('id, name, church_id, card_color')
                .eq('id', cellId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!cellId,
    });

    // Fetch workers for the "Responsável" select (public)
    const { data: workers } = useQuery({
        queryKey: ['public_workers', cellId],
        queryFn: async () => {
            const { data } = await supabase
                .from('workers')
                .select('id, name, surname')
                .eq('cell_id', cellId)
                .order('name', { ascending: true });
            return data || [];
        },
        enabled: !!cellId,
    });

    // Fetch default passer price from settings (public)
    const { data: settings } = useQuery({
        queryKey: ['public_settings', cell?.church_id],
        queryFn: async () => {
            const { data } = await supabase
                .from('settings')
                .select('key, value')
                .eq('church_id', cell.church_id)
                .in('key', ['passer_price']);
            const map = {};
            (data || []).forEach(s => { map[s.key] = s.value; });
            return map;
        },
        enabled: !!cell?.church_id,
    });

    const defaultPrice = parseFloat(settings?.passer_price || '290.00');

    // Submit mutation (public insert)
    const submitMutation = useMutation({
        mutationFn: async (formPayload) => {
            const { error } = await supabase.from('passers').insert(formPayload);
            if (error) throw error;
        },
        onSuccess: () => {
            setSubmitted(true);
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao enviar cadastro. Tente novamente.');
            setIsUploading(false);
        },
    });

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        const formData = new FormData(e.target);

        let photo_url = '';
        try {
            if (photoFile && photoFile.size > 0) {
                const compressedFile = await compressImage(photoFile);
                const fileExt = compressedFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `passers/${fileName}`;
                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(filePath, compressedFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(filePath);
                photo_url = publicUrl;
            }

            const payload = {
                name: formData.get('name'),
                surname: formData.get('surname'),
                phone: formData.get('phone'),
                photo_url,
                payment_status: 'pending',
                payment_amount: defaultPrice,
                birth_date: formData.get('birth_date') || null,
                age: formData.get('age') ? parseInt(formData.get('age')) : null,
                address: formData.get('address'),
                family_contact_1: formData.get('family_contact_1'),
                family_contact_2: formData.get('family_contact_2'),
                food_restrictions: formData.get('food_restrictions'),
                controlled_medication: formData.get('controlled_medication'),
                physical_restrictions: formData.get('physical_restrictions'),
                responsible_worker_id: formData.get('responsible_worker_id') || null,
                cell_id: cellId,
                church_id: cell.church_id,
            };

            submitMutation.mutate(payload);
        } catch (error) {
            console.error('Erro upload:', error);
            toast.error('Erro ao enviar foto. Tente novamente.');
            setIsUploading(false);
        }
    };

    // --- STATES ---
    if (cellLoading) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (cellError || !cell) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <AlertCircle className="h-14 w-14 text-red-400 mx-auto mb-3" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-1">Link inválido</h2>
                    <p className="text-slate-500 text-sm">Este link de inscrição não é válido ou a célula não existe.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
                <Toaster position="top-right" />
                <div className="text-center max-w-sm w-full">
                    {/* Success Icon with animated ring */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40"></div>
                        <div className="relative w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center ring-2 ring-emerald-200">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        </div>
                    </div>

                    {/* Cell color dot */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: cell.card_color || '#6366f1' }}
                        />
                        <span className="text-sm font-medium text-slate-500">{cell.name}</span>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-3 leading-snug">
                        Cadastro realizado!
                    </h2>
                    <p className="text-lg text-emerald-600 font-medium italic mb-6">
                        "Esse encontro vai mudar sua vida"
                    </p>
                    <p className="text-sm text-slate-500">
                        Em breve nossa equipe entrará em contato. 🙏
                    </p>
                </div>
            </div>
        );
    }

    const isLoading = isUploading || submitMutation.isPending;

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-[Poppins,sans-serif]">
            <Toaster position="top-right" />

            {/* Header */}
            <div
                className="sticky top-0 z-10 bg-[#1A1A1B] text-white px-4 py-3 flex items-center gap-3 shadow-md"
            >
                <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cell.card_color || '#6366f1' }}
                />
                <div>
                    <p className="text-[10px] text-slate-300 leading-none uppercase tracking-wider mb-1">Inscrição para</p>
                    <h1 className="text-base font-bold leading-tight text-white">{cell.name}</h1>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-xl mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">

                    {/* Form header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                        <h2 className="text-lg font-bold text-white">Ficha de Cadastro</h2>
                        <p className="text-indigo-100/80 text-xs mt-0.5">Preencha seus dados para participar do encontro</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-5">

                        {/* Photo upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Foto de perfil"
                                        className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-200"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-indigo-50 ring-2 ring-indigo-100 flex items-center justify-center">
                                        <Upload className="h-8 w-8 text-indigo-300" />
                                    </div>
                                )}
                                <label
                                    htmlFor="photo-upload"
                                    className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-indigo-500 transition-colors shadow"
                                >
                                    <Upload className="h-3 w-3" />
                                </label>
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </div>
                            <p className="text-xs text-slate-400">Clique no ícone para adicionar uma foto</p>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dados Pessoais</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                                    <input
                                        name="name"
                                        required
                                        placeholder="Seu nome"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Sobrenome *</label>
                                    <input
                                        name="surname"
                                        required
                                        placeholder="Seu sobrenome"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Telefone / WhatsApp</label>
                            <input
                                name="phone"
                                type="tel"
                                placeholder="(00) 00000-0000"
                                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Data de Nascimento</label>
                                <input
                                    name="birth_date"
                                    type="date"
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Idade</label>
                                <input
                                    name="age"
                                    type="number"
                                    placeholder="Ex: 25"
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
                            <textarea
                                name="address"
                                rows={2}
                                placeholder="Rua, número, bairro, cidade..."
                                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
                            />
                        </div>

                        {/* Contacts */}
                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contatos de Emergência</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Familiar 1</label>
                                    <input
                                        name="family_contact_1"
                                        placeholder="(número) + parentesco"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Familiar 2</label>
                                    <input
                                        name="family_contact_2"
                                        placeholder="(número) + parentesco"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Responsible Worker */}
                        {workers && workers.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Responsável (Trabalhador)</label>
                                <select
                                    name="responsible_worker_id"
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                >
                                    <option value="">Selecione um responsável</option>
                                    {workers.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} {w.surname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Health info */}
                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Saúde & Restrições</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Restrição Alimentar ou Alergia?</label>
                                    <input
                                        name="food_restrictions"
                                        placeholder="Ex: lactose, glúten... (deixe em branco se não houver)"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Toma Medicamento Controlado?</label>
                                    <input
                                        name="controlled_medication"
                                        placeholder="Informe o medicamento (deixe em branco se não houver)"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Restrição ou Deficiência Física?</label>
                                    <input
                                        name="physical_restrictions"
                                        placeholder="Informe (deixe em branco se não houver)"
                                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rules and Information */}
                        <div className="border-t border-slate-100 pt-5 space-y-4">
                            <div className="bg-slate-900 rounded-lg p-3">
                                <h3 className="text-[10px] font-black text-white text-center uppercase tracking-[0.2em]">Informações Gerais</h3>
                            </div>
                            
                            <ul className="space-y-3 px-1">
                                <li className="flex gap-2">
                                    <span className="text-red-500 font-bold shrink-0">•</span>
                                    <p className="text-[11px] font-bold text-red-600 uppercase leading-tight">
                                        NÃO DEVOLVEMOS O DINHEIRO DA INSCRIÇÃO, EM HIPÓTESE ALGUMA.
                                    </p>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-slate-400 font-bold shrink-0">•</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase leading-tight">
                                        É NECESSÁRIO A AUTORIZAÇÃO DOS RESPONSÁVEIS PARA OS MENORES DE 18 ANOS.
                                    </p>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-slate-400 font-bold shrink-0">•</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase leading-tight">
                                        NÃO É PERMITIDO A IDA DE: CRIANÇAS (0 A 11 ANOS), GRÁVIDAS EM QUALQUER TEMPO DE GESTAÇÃO, PESSOAS IDOSAS A PARTIR DE 60 ANOS, E PESSOAS COM DOENÇAS CRÔNICAS, E QUE NECESSITEM DE CUIDADOS ESPECIAIS.
                                    </p>
                                </li>
                            </ul>

                            <div className="bg-slate-900 rounded-lg p-3">
                                <h3 className="text-[10px] font-black text-white text-center uppercase tracking-[0.2em]">Pagamentos e Condições</h3>
                            </div>

                            <div className="space-y-2">
                                <div className="border border-slate-200 rounded-lg p-3 text-center">
                                    <p className="text-[11px] font-bold text-slate-800 uppercase">No dia só aceitamos pagamentos em dinheiro</p>
                                </div>
                                <div className="border border-slate-200 rounded-lg p-3 text-center">
                                    <p className="text-[11px] font-bold text-slate-800 uppercase">Pagamento com cartão até 1 dia antes</p>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                'Enviar Cadastro'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-[10px] text-slate-400 italic">
                    "Tudo seja feito com ordem." – 1 Coríntios 14:40
                </p>
            </div>
        </div>
    );
}
