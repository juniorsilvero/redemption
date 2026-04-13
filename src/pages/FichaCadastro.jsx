import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'react-hot-toast';
import { compressImage } from '../lib/utils';
import { CheckCircle2, Upload, Loader2, AlertCircle, FileText } from 'lucide-react';
import { generateRegistrationPDF } from '../utils/registrationPdfGenerator';

const ESTADOS_BRASIL = [
    { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
];

export default function FichaCadastro() {
    const { cellId } = useParams();
    const [submitted, setSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [birthDate, setBirthDate] = useState('');
    const [ageValue, setAgeValue] = useState('');

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
        onSuccess: (_, variables) => {
            setSubmittedData({ ...variables });
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
                neighborhood: formData.get('neighborhood'),
                city: formData.get('city'),
                state: formData.get('state'),
                family_contact_1: formData.get('family_contact_1'),
                family_relationship_1: formData.get('family_relationship_1'),
                family_contact_2: formData.get('family_contact_2'),
                family_relationship_2: formData.get('family_relationship_2'),
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
    
    // --- COMPUTED ---
    const isLoading = isUploading || submitMutation.isPending;
    
    const showMinorWarning = useMemo(() => {
        if (!birthDate && !ageValue) return false;

        const currentYear = new Date().getFullYear();
        
        // Check by birth date first (more accurate)
        if (birthDate) {
            const birthYear = new Date(birthDate).getFullYear();
            // If they turn 18 this year or are already 18+, no warning
            if (currentYear - birthYear >= 18) return false;
            return true;
        }

        // Fallback to manual age input
        if (ageValue) {
            return parseInt(ageValue) < 18;
        }

        return false;
    }, [birthDate, ageValue]);

    // --- RENDER STATES ---
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
                    <p className="text-sm text-slate-500 mb-6">
                        Em breve nossa equipe entrará em contato. 🙏
                    </p>

                    <button
                        onClick={() => {
                            const responsibleWorker = workers?.find(w => w.id === submittedData.responsible_worker_id);
                            const enrichedData = {
                                ...submittedData,
                                cell_name: cell?.name,
                                cell_color: cell?.card_color,
                                responsible_worker_name: responsibleWorker ? `${responsibleWorker.name} ${responsibleWorker.surname}` : null
                            };
                            generateRegistrationPDF(enrichedData, 'IGREJA INTERNACIONAL GERAÇÃO PROFÉTICA', defaultPrice);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                    >
                        <FileText className="h-5 w-5" />
                        Gerar PDF da Inscrição
                    </button>
                    {submittedData?.age < 18 && (
                        <p className="text-xs text-red-500 mt-3 font-medium">
                            Como você é menor de idade, não se esqueça de imprimir o PDF e pegar a assinatura do seu responsável!
                        </p>
                    )}
                </div>
            </div>
        );
    }



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
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Ficha de Cadastro</h2>
                            <p className="text-indigo-100/80 text-xs mt-0.5">Preencha seus dados para participar do encontro</p>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Valor da Inscrição</span>
                            <span className="text-xl font-black text-white">R$ {defaultPrice % 1 === 0 ? defaultPrice.toFixed(0) : defaultPrice.toFixed(2)}</span>
                        </div>
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
                            <label className="block text-xs font-medium text-slate-600 mb-1">Telefone / WhatsApp *</label>
                            <input
                                name="phone"
                                type="tel"
                                required
                                placeholder="(00) 00000-0000"
                                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Data de Nascimento *</label>
                                <input
                                    name="birth_date"
                                    type="date"
                                    required
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Idade *</label>
                                <input
                                    name="age"
                                    type="number"
                                    required
                                    value={ageValue}
                                    onChange={(e) => setAgeValue(e.target.value)}
                                    placeholder="Ex: 25"
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>
                        </div>

                        {showMinorWarning && (
                            <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2 animate-pulse">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-[11px] font-bold text-red-600 leading-tight">
                                    MENOR DE IDADE: Finalize o cadastro, gere o PDF, imprima e peça para o responsável assinar e entregar para o trabalhador responsável por você no encontro.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Endereço (Rua e Número) *</label>
                            <input
                                name="address"
                                required
                                placeholder="Ex: Rua das Flores, 123"
                                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Bairro *</label>
                                <input
                                    name="neighborhood"
                                    required
                                    placeholder="Bairro"
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Cidade *</label>
                                <input
                                    name="city"
                                    required
                                    placeholder="Cidade"
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
                                <select
                                    name="state"
                                    required
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                >
                                    <option value="">UF</option>
                                    {ESTADOS_BRASIL.map(uf => (
                                        <option key={uf.sigla} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contatos de Emergência</p>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Telefone de um Familiar 1 *</label>
                                        <input
                                            name="family_contact_1"
                                            required
                                            placeholder="(00) 00000-0000"
                                            className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Grau de Parentesco *</label>
                                        <input
                                            name="family_relationship_1"
                                            required
                                            placeholder="Ex: Mãe, Pai, Irmão..."
                                            className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Telefone de um Familiar 2</label>
                                        <input
                                            name="family_contact_2"
                                            placeholder="(00) 00000-0000"
                                            className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Grau de Parentesco</label>
                                        <input
                                            name="family_relationship_2"
                                            placeholder="Ex: Mãe, Pai, Irmão..."
                                            className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Responsible Worker */}
                        {workers && workers.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Responsável (Trabalhador) *</label>
                                <select
                                    name="responsible_worker_id"
                                    required
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
