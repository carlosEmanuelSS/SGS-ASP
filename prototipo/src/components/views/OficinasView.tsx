import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowLeft, CheckSquare, X, Edit, Trash2, AlertCircle, Users, BookOpen, Building2, Calendar, UserPlus } from 'lucide-react';

import { Oficina } from '../../types/models';
import { storageService } from '../../services/storage';
import { businessRules } from '../../services/businessRules';

export function OficinasView() {
    const [currentView, setCurrentView] = useState<'list' | 'form' | 'details'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

    const [globalEducandos, setGlobalEducandos] = useState<any[]>([]);
    const [oficinasData, setOficinasData] = useState<Oficina[]>([]);

    const loadData = () => {
        setGlobalEducandos(storageService.getEducandos());
        setOficinasData(storageService.getOficinas());
    };

    useEffect(() => {
        loadData();
    }, [currentView]);

    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
    };

    const handleSave = (oficina: Oficina) => {
        const newData = selectedId 
            ? oficinasData.map(o => o.id === oficina.id ? oficina : o)
            : [oficina, ...oficinasData];
        storageService.saveOficinas(newData);
        loadData();
        showToast(selectedId ? 'Oficina atualizada com sucesso!' : 'Oficina criada com sucesso!');
        setCurrentView('list');
    };

    const handleDelete = (id: string) => {
        const newData = oficinasData.filter(o => o.id !== id);
        storageService.saveOficinas(newData);
        loadData();
        setDeleteModal({ isOpen: false, id: null });
        showToast('Oficina removida definitivamente.');
        if (currentView === 'details') setCurrentView('list');
    };

    const handleEnroll = (oficinaId: string, studentId: string) => {
        const result = businessRules.realizarMatricula(studentId, oficinaId);
        if (result.success) {
            loadData();
            showToast(result.message);
        } else {
            alert(result.message);
        }
    };

    const handleUnenroll = (oficinaId: string, studentId: string) => {
        const oficinas = storageService.getOficinas();
        const educandos = storageService.getEducandos();
        
        // Remove da oficina
        const newData = oficinas.map(o => o.id === oficinaId ? { ...o, educandosMatriculados: o.educandosMatriculados.filter(s => s !== studentId) } : o);
        storageService.saveOficinas(newData);
        
        // Remove do educando
        const newEduData = educandos.map(e => e.id === studentId ? { ...e, oficinasVinculadas: e.oficinasVinculadas.filter(o => o !== oficinaId) } : e);
        storageService.saveEducandos(newEduData);
        
        loadData();
        showToast('Matrícula cancelada com sucesso.');
    };

    const activeOficina = useMemo(() => oficinasData.find(o => o.id === selectedId), [oficinasData, selectedId]);

    return (
        <div className="animate-in fade-in duration-300 relative">
            {toast.show && (
                <div className="fixed bottom-4 right-4 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 border border-slate-700">
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                    <p className="font-medium">{toast.msg}</p>
                    <button onClick={() => setToast({ show: false, msg: '' })} className="ml-4 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            )}

            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Oficina?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Todos os educandos perderão o vínculo ativo com esta oficina.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-8">
                            <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={() => deleteModal.id && handleDelete(deleteModal.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors">Sim, Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {currentView === 'list' && (
                <OficinasList
                    data={oficinasData}
                    onView={(id: string) => { setSelectedId(id); setCurrentView('details'); }}
                    onEdit={(id: string) => { setSelectedId(id); setCurrentView('form'); }}
                    onDelete={(id: string) => setDeleteModal({ isOpen: true, id })}
                    onCreate={() => { setSelectedId(null); setCurrentView('form'); }}
                />
            )}

            {currentView === 'form' && (
                <OficinaForm
                    initialData={activeOficina}
                    onBack={() => setCurrentView('list')}
                    onSave={handleSave}
                />
            )}

            {currentView === 'details' && activeOficina && (
                <OficinaDetails
                    oficina={activeOficina}
                    globalEducandos={globalEducandos}
                    onBack={() => setCurrentView('list')}
                    onEnroll={(studentId: string) => handleEnroll(activeOficina.id, studentId)}
                    onUnenroll={(studentId: string) => handleUnenroll(activeOficina.id, studentId)}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: LIST
// ----------------------------------------------------
function OficinasList({ data, onView, onEdit, onDelete, onCreate }: any) {
    const [search, setSearch] = useState('');
    const filtered = data.filter((o: Oficina) => o.nome.toLowerCase().includes(search.toLowerCase()));

    const getTypeBadge = (tipo: string) => {
        switch (tipo) {
            case 'Esporte': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
            case 'Cultura': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
            case 'Educação': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Oficinas e Atividades</h1>
                <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors w-fit">
                    <Plus className="w-4 h-4" /> Nova Oficina
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar oficina..." className="pl-9 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:border-indigo-500 outline-none dark:text-slate-200" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Nome da Oficina</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Educador Responsável</th>
                                <th className="px-6 py-4 text-center">Turno</th>
                                <th className="px-6 py-4 text-center">Vagas</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filtered.map((row: Oficina) => {
                                const ocupadas = row.educandosMatriculados.length;
                                const isLotado = !businessRules.podeMatricular(row);
                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                                            {row.nome}
                                            <span className="block text-xs text-slate-500 font-normal mt-0.5">{row.diasSemana.join(', ')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-bold ${getTypeBadge(row.tipo)}`}>{row.tipo}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.educadorResponsavel}</td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{row.turno}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-semibold ${isLotado ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {ocupadas}/{row.limiteVagas}
                                            </span>
                                            {isLotado && <span className="block text-[10px] text-red-500 uppercase font-bold mt-0.5">Lotado</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => onView(row.id)} title="Gerenciar Turma" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 rounded-lg transition-colors"><Users className="w-4 h-4" /></button>
                                                <button onClick={() => onEdit(row.id)} title="Editar Oficina" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => onDelete(row.id)} title="Excluir Oficina" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
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
function OficinaForm({ initialData, onBack, onSave }: any) {
    const [form, setForm] = useState<Oficina>(initialData || {
        id: Date.now().toString(),
        nome: '',
        tipo: 'Educação',
        educadorResponsavel: '',
        limiteVagas: '',
        diasSemana: [],
        turno: 'Tarde',
        unidade: 'Sede Central',
        educandosMatriculados: [],
        faixaEtaria: '',
        descricao: '',
        horarios: ''
    });

    const diasOptions = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const toggleDia = (dia: string) => {
        if (form.diasSemana.includes(dia)) {
            setForm({ ...form, diasSemana: form.diasSemana.filter(d => d !== dia) });
        } else {
            setForm({ ...form, diasSemana: [...form.diasSemana, dia] });
        }
    };

    const isFormValid =
        form.nome.trim() !== '' &&
        form.educadorResponsavel.trim() !== '' &&
        Number(form.limiteVagas) > 0 &&
        form.diasSemana.length > 0 &&
        form.unidade.trim() !== '';

    const handleSubmit = () => {
        if (!isFormValid) return;
        onSave({ ...form, limiteVagas: Number(form.limiteVagas) });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {initialData ? `Editar Oficina: ${initialData.nome}` : 'Criar Nova Oficina'}
                </h1>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 md:p-8 space-y-8">

                {/* Sessão 1 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2">1. Dados Básicos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome da Oficina <span className="text-red-500">*</span></label>
                            <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo <span className="text-red-500">*</span></label>
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as any })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                                <option value="Esporte">Esporte</option>
                                <option value="Cultura">Cultura</option>
                                <option value="Educação">Educação</option>
                                <option value="Qualificação">Qualificação Profissional</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unidade / Núcleo <span className="text-red-500">*</span></label>
                            <input type="text" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                        </div>
                    </div>
                </div>

                {/* Sessão 2 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2">2. Responsável e Capacidade</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Educador Responsável <span className="text-red-500">*</span></label>
                            <select value={form.educadorResponsavel} onChange={e => setForm({ ...form, educadorResponsavel: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                                <option value="">Selecione...</option>
                                <option value="Prof. Roberto (TI)">Prof. Roberto (TI)</option>
                                <option value="Prof. Mário (Ed. Física)">Prof. Mário (Ed. Física)</option>
                                <option value="Profa. Eliane">Profa. Eliane (Artes)</option>
                                <option value="Profa. Silvana">Profa. Silvana (Reforço)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Limite de Vagas <span className="text-red-500">*</span></label>
                            <input type="number" value={form.limiteVagas} onChange={e => setForm({ ...form, limiteVagas: e.target.value as any })} min="1" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                        </div>
                    </div>
                </div>

                {/* Sessão 3 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2">3. Cronograma</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Turno <span className="text-red-500">*</span></label>
                            <select value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value as any })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                                <option value="Manhã">Manhã</option>
                                <option value="Tarde">Tarde</option>
                                <option value="Noite">Noite</option>
                                <option value="Integral">Integral</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Horário (Início - Fim)</label>
                            <input type="text" placeholder="Ex: 14:00 às 16:00" value={form.horarios} onChange={e => setForm({ ...form, horarios: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dias da Semana <span className="text-red-500">*</span></label>
                            <div className="flex flex-wrap gap-3">
                                {diasOptions.map(dia => (
                                    <label key={dia} className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        <input type="checkbox" checked={form.diasSemana.includes(dia)} onChange={() => toggleDia(dia)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">{dia}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {!isFormValid ? "Preencha todos os campos obrigatórios (*)" : ""}
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
                            Salvar Oficina
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: DETAILS (GESTÃO DE TURMA)
// ----------------------------------------------------
function OficinaDetails({ oficina, globalEducandos, onBack, onEnroll, onUnenroll }: any) {
    const [activeTab, setActiveTab] = useState<'matriculados' | 'info'>('matriculados');
    const [enrollModal, setEnrollModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const ocupadas = oficina.educandosMatriculados.length;
    const limite = parseInt(oficina.limiteVagas, 10) || 0;
    const disponiveis = limite - ocupadas;
    const isLotado = !businessRules.podeMatricular(oficina);

    // Hydrate enrolled students tracking IDs against global state
    const enrolledStudents = oficina.educandosMatriculados.map((id: string) => {
        const realEdu = globalEducandos.find((e: any) => e.id === id);
        if (realEdu) return realEdu;
        return {
            id,
            nome: 'Aluno Removido do Sistema',
            dadosPessoais: { dataNascimento: '' },
            nucleoFamiliar: { responsavel: '-', telefone: '-' }
        };
    });

    // Filter available students for Modal
    const getAge = (dateString: string) => {
        if (!dateString) return '--';
        const ageDifMs = Date.now() - new Date(dateString).getTime();
        return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
    };

    const availableStudents = businessRules.getEducandosParaMatricula().filter((e: any) => !oficina.educandosMatriculados.includes(e.id));
    const filteredAvailable = availableStudents.filter((e: any) => e.nome.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleConfirmEnroll = (studentId: string) => {
        onEnroll(studentId);
        setEnrollModal(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{oficina.nome}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 px-2 py-0.5 rounded font-medium">{oficina.turno}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">• {oficina.educadorResponsavel}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Capacidade</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{limite}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><Building2 className="w-5 h-5" /></div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ocupadas</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{ocupadas}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Users className="w-5 h-5" /></div>
                </div>
                <div className={`border rounded-xl p-5 shadow-sm flex items-center justify-between transition-colors ${isLotado ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'}`}>
                    <div>
                        <p className={`text-sm font-medium ${isLotado ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>Disponíveis</p>
                        <p className={`text-2xl font-bold mt-1 ${isLotado ? 'text-red-700 dark:text-red-300' : 'text-emerald-800 dark:text-emerald-300'}`}>{disponiveis}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center"><CheckSquare className={`w-5 h-5 ${isLotado ? 'text-red-600' : 'text-emerald-600'}`} /></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-900/50">
                    <button onClick={() => setActiveTab('matriculados')} className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'matriculados' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                        Turma ({ocupadas})
                    </button>
                    <button onClick={() => setActiveTab('info')} className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                        Informações Gerais
                    </button>
                </div>

                <div className="p-6 flex-1">
                    {activeTab === 'matriculados' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                <button
                                    onClick={() => setEnrollModal(true)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" /> Matricular Educando
                                </button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left align-middle">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                        <tr><th className="px-4 py-3">Nome do Educando</th><th className="px-4 py-3">Idade</th><th className="px-4 py-3">Responsável (Tel)</th><th className="px-4 py-3 text-right">Ação</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {enrolledStudents.map((ed: any) => (
                                            <tr key={ed.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{ed.nome.charAt(0)}</div>
                                                    {ed.nome}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{getAge(ed.dadosPessoais?.dataNascimento)} anos</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    <p className="text-slate-900 dark:text-slate-200 font-medium">{ed.nucleoFamiliar?.responsavel}</p>
                                                    <p className="text-xs">{ed.nucleoFamiliar?.telefone}</p>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => onUnenroll(ed.id)} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1 gap-1 flex items-center ml-auto rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                                        <X className="w-3 h-3" /> Remover
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {enrolledStudents.length === 0 && (
                                            <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Nenhum educando matriculado ainda. Clicar em "Matricular Educando" para adicionar.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2"><Calendar className="w-4 h-4" /> Quando</h4>
                                    <p className="font-medium text-slate-900 dark:text-white">{oficina.diasSemana.join(', ')}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{oficina.horarios}</p>
                                </div>
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2"><Building2 className="w-4 h-4" /> Local</h4>
                                    <p className="font-medium text-slate-900 dark:text-white">{oficina.unidade}</p>
                                </div>
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2"><Users className="w-4 h-4" /> Específico para</h4>
                                    <p className="font-medium text-slate-900 dark:text-white">{oficina.faixaEtaria || 'Público em geral'}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2"><BookOpen className="w-4 h-4" /> Descrição da Atividade</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-inner">
                                    {oficina.descricao || 'Nenhuma descrição fornecida para esta oficina e atividade no momento.'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ENROLL MODAL WITH DYNAMIC SEARCH */}
            {enrollModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserPlus className="w-5 h-5" /> Matricular Novo Educando</h3>
                            <button onClick={() => setEnrollModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
                        </div>

                        {isLotado ? (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-lg mb-2 flex items-start gap-3 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-700 dark:text-red-400">⚠️ Esta oficina já atingiu a capacidade máxima de vagas.</p>
                                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Remova um aluno antes de matricular novos na turma.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 flex-1 overflow-hidden flex flex-col mb-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-3 rounded-lg flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong>Aviso:</strong> Apenas educandos ativos podem ser matriculados. Educandos em Lista de Espera não estão aptos para matrícula.
                                    </p>
                                </div>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="🔎 Buscar pelo nome do educando..."
                                        className="pl-9 pr-4 py-3 w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-200 shadow-sm"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[250px] border border-slate-100 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900/20">
                                    {filteredAvailable.length > 0 ? filteredAvailable.map((student: any) => (
                                        <div key={student.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:border-indigo-300 transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{student.nome}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{getAge(student.dadosPessoais?.dataNascimento)} anos • Resp: {student.nucleoFamiliar?.responsavel}</p>
                                            </div>
                                            <button
                                                onClick={() => handleConfirmEnroll(student.id)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 font-medium text-xs rounded hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white transition-colors ml-2 shrink-0"
                                            >
                                                Matricular
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8 text-slate-500 text-sm">Nenhum educando disponível correspondente à busca.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setEnrollModal(false)}
                                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >{isLotado ? 'Fechar' : 'Cancelar'}</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
