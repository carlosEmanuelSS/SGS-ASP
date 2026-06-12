import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, ArrowLeft, Upload, FileText, Calendar, CheckSquare, X, Edit, Trash2, AlertCircle } from 'lucide-react';

import { Educando } from '../../types/models';
import { storageService } from '../../services/storage';
import { businessRules } from '../../services/businessRules';

export function EducandosView() {
    // Navigation State required by prompt
    const [currentView, setCurrentView] = useState<'list' | 'form' | 'details'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

    const [educandosData, setEducandosData] = useState<Educando[]>([]);

    const loadData = () => {
        setEducandosData(storageService.getEducandos());
    };

    useEffect(() => {
        loadData();
    }, [currentView]);

    // Toast Helper
    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
    };

    // CRUD Actions
    const adicionarEducando = (novo: any) => {
        const preparado = businessRules.prepareNovoEducando(novo);
        const newData = [preparado, ...educandosData];
        storageService.saveEducandos(newData);
        loadData();
        showToast('Novo educando cadastrado na Lista de Espera!');
        setCurrentView('list');
    };

    const atualizarEducando = (atualizado: Educando) => {
        const newData = educandosData.map(e => e.id === atualizado.id ? atualizado : e);
        storageService.saveEducandos(newData);
        loadData();
        showToast('Dados atualizados com sucesso!');
        setCurrentView('list');
    };

    const excluirEducando = (id: string) => {
        businessRules.inativarEducando(id);
        loadData();
        setDeleteModal({ isOpen: false, id: null });
        showToast('Educando inativado (soft delete).');
        if (currentView === 'details') setCurrentView('list');
    };

    const ativarEducando = (id: string) => {
        const updated = educandosData.find(e => e.id === id);
        if (updated) {
            const newData = educandosData.map(e => e.id === id ? { ...e, status: 'ativo' as const } : e);
            storageService.saveEducandos(newData);
            loadData();
            showToast('Educando ativado com sucesso!');
        }
    };

    const activeEducando = useMemo(() => educandosData.find(e => e.id === selectedId), [educandosData, selectedId]);

    return (
        <div className="animate-in fade-in duration-300 relative">

            {/* GLOBAL TOAST */}
            {toast.show && (
                <div className="fixed bottom-4 right-4 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 border border-slate-700">
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                    <p className="font-medium">{toast.msg}</p>
                    <button onClick={() => setToast({ show: false, msg: '' })} className="ml-4 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* DELETE MODAL (DIALOG) */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Educando?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Tem certeza que deseja excluir? Esta ação apagará todo o histórico e vínculos permanentemente.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-8">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, id: null })}
                                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => deleteModal.id && excluirEducando(deleteModal.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === VIEW: LIST === */}
            {currentView === 'list' && (
                <EducandosList
                    data={educandosData}
                    onView={(id: string) => { setSelectedId(id); setCurrentView('details'); }}
                    onEdit={(id: string) => { setSelectedId(id); setCurrentView('form'); }}
                    onDelete={(id: string) => setDeleteModal({ isOpen: true, id })}
                    onCreate={() => { setSelectedId(null); setCurrentView('form'); }}
                />
            )}

            {/* === VIEW: FORM === */}
            {currentView === 'form' && (
                <>
                    <EducandoForm
                        initialData={activeEducando}
                        onBack={() => setCurrentView('list')}
                        onSave={(data: Educando) => {
                            if (activeEducando) atualizarEducando(data);
                            else adicionarEducando(data);
                        }}
                    />
                </>
            )}

            {/* === VIEW: DETAILS === */}
            {currentView === 'details' && activeEducando && (
                <>
                    <EducandosDetails
                        educando={activeEducando}
                        onBack={() => setCurrentView('list')}
                        onEdit={() => setCurrentView('form')}
                        onDelete={() => setDeleteModal({ isOpen: true, id: selectedId })}
                        onAtivar={() => activeEducando && ativarEducando(activeEducando.id)}
                    />
                </>
            )}
        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: LIST
// ----------------------------------------------------
function EducandosList({ data, onView, onEdit, onDelete, onCreate }: any) {
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState<'todos' | 'ativo' | 'lista_espera' | 'inativo'>('todos');

    const filtered = data.filter((e: Educando) => {
        const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase());
        const matchTab = filterTab === 'todos' || e.status === filterTab;
        return matchSearch && matchTab;
    });

    const formatStatus = (status: string) => {
        switch (status) {
            case 'ativo': return 'Ativo';
            case 'inativo': return 'Inativo';
            case 'lista_espera': return 'Lista de Espera';
            default: return status;
        }
    };

    const getAge = (dateString: string) => {
        if (!dateString) return '--';
        const ageDifMs = Date.now() - new Date(dateString).getTime();
        return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Educandos</h1>
                <button onClick={onCreate} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors w-full sm:w-fit">
                    <Plus className="w-4 h-4" /> Novo Educando
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'ativo', label: 'Ativos' },
                        { id: 'lista_espera', label: 'Lista de Espera' },
                        { id: 'inativo', label: 'Inativos' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterTab(tab.id as any)}
                            className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${filterTab === tab.id
                                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por nome..." className="pl-9 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-200" />
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm text-left align-middle">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Idade</th>
                                <th className="px-6 py-4">Responsável</th>
                                <th className="px-6 py-4">Oficinas Vinculadas</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filtered.map((row: Educando) => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                                            {row.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-900 dark:text-slate-200 block">{row.nome}</span>
                                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                ${row.status === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                    row.status === 'lista_espera' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                {formatStatus(row.status)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{getAge(row.dadosPessoais.dataNascimento)} anos</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        <span className="block">{row.nucleoFamiliar.responsavel}</span>
                                        <span className="text-xs text-slate-400">{row.nucleoFamiliar.grauParentesco}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {row.oficinasVinculadas.length > 0 ? row.oficinasVinculadas.map((oficina, i) => (
                                                <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-xs border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                    {oficina}
                                                </span>
                                            )) : <span className="text-xs text-slate-400 italic">Nenhuma</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Tooltips using native title for simplicity, proper tooltips need Radix or similar */}
                                            <button onClick={() => onView(row.id)} title="Visualizar" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onEdit(row.id)} title="Editar" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDelete(row.id)} title="Excluir" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Nenhum educando encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: FORM
// ----------------------------------------------------
function EducandoForm({ initialData, onBack, onSave }: any) {
    const [activeTab, setActiveTab] = useState<'pessoal' | 'familia' | 'docs'>('pessoal');

    const [form, setForm] = useState<Educando>(initialData || {
        id: Date.now().toString(),
        nome: '',
        status: 'lista_espera',
        dadosPessoais: { dataNascimento: '', cpf: '', matriculaEscolar: '' },
        nucleoFamiliar: { responsavel: '', grauParentesco: '', telefone: '', renda: '' },
        socialDocs: { programasSociais: false, observacoes: '' },
        oficinasVinculadas: []
    });

    const isPessoalValid = form.nome.trim() !== '' && form.dadosPessoais.dataNascimento !== '' && form.dadosPessoais.matriculaEscolar.trim() !== '';
    const isFamiliaValid = form.nucleoFamiliar.responsavel.trim() !== '' && form.nucleoFamiliar.grauParentesco.trim() !== '' && form.nucleoFamiliar.telefone.trim() !== '' && form.nucleoFamiliar.renda.trim() !== '';
    // Checkbox and textareas are technically always "valid" even if empty unless explicitly required. But prompt says "Preenchidos". We'll assume checkbox + textarea must be filled.
    const isFormValid = isPessoalValid && isFamiliaValid && form.socialDocs.observacoes.trim() !== '';

    const handleSubmit = () => {
        if (!isFormValid) return; // button will be disabled anyway
        onSave(form);
    };

    const updateNested = (category: keyof Educando, field: string, value: any) => {
        setForm({ ...form, [category]: { ...(form[category] as any), [field]: value } });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {initialData ? `Editar Educando: ${initialData.nome}` : 'Cadastrar Novo Educando'}
                    </h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'pessoal', label: 'Pessoal', valid: isPessoalValid },
                        { id: 'familia', label: 'Família', valid: isFamiliaValid },
                        { id: 'docs', label: 'Social & Docs', valid: form.socialDocs.observacoes.trim() !== '' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            {tab.label}
                            {tab.valid && <CheckSquare className="w-3.5 h-3.5 text-emerald-500 hidden sm:block" />}
                        </button>
                    ))}
                </div>

                {/* Areas */}
                <div className="p-6 md:p-8 flex-1">
                    {activeTab === 'pessoal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo <span className="text-red-500">*</span></label>
                                <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data de Nascimento <span className="text-red-500">*</span></label>
                                <input type="date" value={form.dadosPessoais.dataNascimento} onChange={e => updateNested('dadosPessoais', 'dataNascimento', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CPF</label>
                                <input type="text" value={form.dadosPessoais.cpf} onChange={e => updateNested('dadosPessoais', 'cpf', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Matrícula Escolar (Detalhes) <span className="text-red-500">*</span></label>
                                <input type="text" value={form.dadosPessoais.matriculaEscolar} onChange={e => updateNested('dadosPessoais', 'matriculaEscolar', e.target.value)} placeholder="Ex: 9º Ano - E.E. Marechal" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'familia' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                            <div className="col-span-full mb-2">
                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg flex gap-3 text-sm border border-blue-100 dark:border-blue-800/30">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p><strong>Atenção:</strong> É obrigatório vincular o educando a um responsável legal para concluir o cadastro estruturado.</p>
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome do Responsável Legal <span className="text-red-500">*</span></label>
                                <input type="text" value={form.nucleoFamiliar.responsavel} onChange={e => updateNested('nucleoFamiliar', 'responsavel', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Grau de Parentesco <span className="text-red-500">*</span></label>
                                <input type="text" value={form.nucleoFamiliar.grauParentesco} onChange={e => updateNested('nucleoFamiliar', 'grauParentesco', e.target.value)} placeholder="Mãe, Pai, Avó..." className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefone <span className="text-red-500">*</span></label>
                                <input type="tel" value={form.nucleoFamiliar.telefone} onChange={e => updateNested('nucleoFamiliar', 'telefone', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Renda Familiar <span className="text-red-500">*</span></label>
                                <input type="text" value={form.nucleoFamiliar.renda} onChange={e => updateNested('nucleoFamiliar', 'renda', e.target.value)} placeholder="R$" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'docs' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex items-center gap-3 border p-4 rounded-lg border-slate-200 dark:border-slate-700">
                                <input type="checkbox" id="ps" checked={form.socialDocs.programasSociais} onChange={e => updateNested('socialDocs', 'programasSociais', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="ps" className="font-medium text-slate-900 dark:text-white cursor-pointer select-none">Atendido por Programas Sociais (Gov)?</label>
                            </div>

                            <div className="space-y-1.5 border-none">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações Técnicas / Parecer Social <span className="text-red-500">*</span></label>
                                <textarea rows={4} value={form.socialDocs.observacoes} onChange={e => updateNested('socialDocs', 'observacoes', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Descreva o contexto..." />
                            </div>

                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-indigo-500" />
                                </div>
                                <p className="font-medium text-slate-900 dark:text-white mb-1">Anexar Documentos Pessoais</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Arraste PDFs ou Imagens (Obrigatório para matrícula)</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {!isFormValid ? "Preencha todos os campos obrigatórios (*)" : "Tudo pronto!"}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onBack} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isFormValid}
                            className="px-6 py-2 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Salvar Cadastro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: DETAILS
// ----------------------------------------------------
function EducandosDetails({ educando, onBack, onEdit, onDelete, onAtivar }: { educando: Educando, onBack: () => void, onEdit: () => void, onDelete: () => void, onAtivar: () => void }) {
    const [activeTab, setActiveTab] = useState<'dados' | 'historico'>('dados');

    const formatStatus = (status: string) => {
        switch (status) {
            case 'ativo': return 'Ativo';
            case 'inativo': return 'Inativo';
            case 'lista_espera': return 'Lista de Espera';
            default: return status;
        }
    };

    const age = educando.dadosPessoais.dataNascimento ?
        Math.abs(new Date(Date.now() - new Date(educando.dadosPessoais.dataNascimento).getTime()).getUTCFullYear() - 1970)
        : '--';

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{educando.nome}</h1>
                </div>
                <div className="flex gap-2">
                    {educando.status === 'lista_espera' && (
                        <button onClick={onAtivar} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                            <CheckSquare className="w-4 h-4" /> Ativar Educando
                        </button>
                    )}
                    <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 shadow-sm">
                        <Edit className="w-4 h-4" /> Editar Dados
                    </button>
                    <button onClick={onDelete} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Card: Summary */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-6 lg:h-fit">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 flex items-center justify-center border-4 border-indigo-50 dark:border-indigo-500/10 text-4xl font-bold text-indigo-300 dark:text-slate-500 select-none">
                            {educando.nome.charAt(0)}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{educando.nome}</h2>
                        <div className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full w-fit mx-auto uppercase tracking-wider
                            ${educando.status === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                educando.status === 'lista_espera' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            Status: {formatStatus(educando.status)}
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Idade / Nascimento</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200 mt-1">{age} anos ({educando.dadosPessoais.dataNascimento})</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Contato de Emergência</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200 mt-1">{educando.nucleoFamiliar.telefone}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Falar com: {educando.nucleoFamiliar.responsavel} ({educando.nucleoFamiliar.grauParentesco})</p>
                        </div>
                    </div>
                </div>

                {/* Right Area: Connections & Tabs */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Card: Connections Visual Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Conexões Familiares</h3>
                            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 text-sm font-bold">R</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{educando.nucleoFamiliar.responsavel}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Responsável Vinculado ({educando.nucleoFamiliar.grauParentesco})</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Oficinas Ativas</h3>
                            <div className="flex flex-wrap gap-2">
                                {educando.oficinasVinculadas.length > 0 ? educando.oficinasVinculadas.map((of, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-md text-sm border border-indigo-100 dark:border-indigo-500/20 font-medium">
                                        {of}
                                    </span>
                                )) : <p className="text-sm text-slate-500">Sem vínculo atual.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Profile Content Tabs */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab('dados')} className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dados' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                Dados Cadastrais
                            </button>
                            <button onClick={() => setActiveTab('historico')} className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'historico' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                Histórico & Atendimentos
                            </button>
                        </div>

                        <div className="p-6">
                            {activeTab === 'dados' && (
                                <div className="space-y-8 animate-in fade-in">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide border-b border-slate-100 pb-2 dark:border-slate-800">1. Informações Pessoais</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><p className="text-slate-500">CPF</p><p className="font-medium text-slate-900 dark:text-slate-200">{educando.dadosPessoais.cpf || 'Não informado'}</p></div>
                                            <div><p className="text-slate-500">Matrícula Escolar</p><p className="font-medium text-slate-900 dark:text-slate-200">{educando.dadosPessoais.matriculaEscolar}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide border-b border-slate-100 pb-2 dark:border-slate-800">2. Estrutura Familiar</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><p className="text-slate-500">Renda Mensal</p><p className="font-medium text-slate-900 dark:text-slate-200">{educando.nucleoFamiliar.renda}</p></div>
                                            <div><p className="text-slate-500">Grau Responsável</p><p className="font-medium text-slate-900 dark:text-slate-200">{educando.nucleoFamiliar.grauParentesco}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide border-b border-slate-100 pb-2 dark:border-slate-800">3. Parecer Social</h4>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{educando.socialDocs.observacoes}"</p>
                                            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-1 rounded">
                                                Programas Sociais: {educando.socialDocs.programasSociais ? 'Sim' : 'Não'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'historico' && (
                                <div className="space-y-8 animate-in fade-in">
                                    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-8 mt-2">
                                        <div className="relative">
                                            <span className="absolute -left-[35px] bg-white dark:bg-slate-900 p-1 rounded-full border border-slate-300 dark:border-slate-600">
                                                <Calendar className="w-4 h-4 text-emerald-500" />
                                            </span>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">Última atualização cadastral salva</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hoje</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute -left-[35px] bg-white dark:bg-slate-900 p-1 rounded-full border border-slate-300 dark:border-slate-600">
                                                <Upload className="w-4 h-4 text-indigo-500" />
                                            </span>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">Documentação de Matrícula enviada</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No momento do cadastro</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
