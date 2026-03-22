import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Eye, ArrowLeft, CheckSquare, X, Lock, Unlock, FileText, Calendar, Filter, User, AlertCircle, EyeOff, ShieldAlert, Edit } from 'lucide-react';

interface Atendimento {
    id: string;
    data: string;
    educandoId: string;
    profissional: string;
    tipo: string;
    descricao: string;
    encaminhamento: string;
    status: 'Realizado' | 'Em Acompanhamento' | 'Finalizado' | 'Cancelado (Erro de Registro)';
    nivelAcesso: 'Público' | 'Confidencial';
}

export function AtendimentosView() {
    const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });

    const [globalEducandos, setGlobalEducandos] = useState<any[]>([]);
    useEffect(() => {
        const savedEducandos = localStorage.getItem('sgs_educandos_db');
        if (savedEducandos) setGlobalEducandos(JSON.parse(savedEducandos));
    }, [currentView]);

    const [atendimentosData, setAtendimentosData] = useState<Atendimento[]>(() => {
        const saved = localStorage.getItem('sgs_atendimentos_db');
        if (saved) return JSON.parse(saved);
        return [
            {
                id: '1',
                data: new Date().toISOString().split('T')[0],
                educandoId: '1', // Mock Carlos
                profissional: 'Ana Silva - Assistente Social',
                tipo: 'Orientação Familiar',
                descricao: 'Família orientada sobre acesso a benefícios.',
                encaminhamento: 'CRAS Norte',
                status: 'Realizado',
                nivelAcesso: 'Público'
            },
            {
                id: '12399',
                data: '2023-11-01',
                educandoId: '1',
                profissional: 'Ana Silva - Assistente Social',
                tipo: 'Visita Domiciliar',
                descricao: 'Visita cancelada.',
                encaminhamento: '',
                status: 'Cancelado (Erro de Registro)',
                nivelAcesso: 'Público'
            },
            {
                id: '2',
                data: '2023-10-15',
                educandoId: '2', // Mock Ana
                profissional: 'Dr. Marcos - Psicólogo',
                tipo: 'Escuta Psicológica',
                descricao: 'Relato sensível omitido.',
                encaminhamento: 'CAPS',
                status: 'Em Acompanhamento',
                nivelAcesso: 'Confidencial'
            }
        ];
    });

    useEffect(() => {
        localStorage.setItem('sgs_atendimentos_db', JSON.stringify(atendimentosData));
    }, [atendimentosData]);

    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 4000);
    };

    const handleSave = (atendimento: Atendimento) => {
        if (selectedId) {
            setAtendimentosData(atendimentosData.map(a => a.id === atendimento.id ? atendimento : a));
            showToast('Atendimento atualizado com sucesso!');
        } else {
            setAtendimentosData([atendimento, ...atendimentosData]);
            showToast('Atendimento registrado com sucesso no prontuário!');
        }
        setCurrentView('list');
    };

    const activeAtendimento = useMemo(() => atendimentosData.find(a => a.id === selectedId), [atendimentosData, selectedId]);

    return (
        <div className="animate-in fade-in duration-300 relative h-full flex flex-col">
            {toast.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 z-50">
                    <CheckSquare className="w-6 h-6 shrink-0" />
                    <p className="font-semibold text-sm md:text-base">{toast.msg}</p>
                    <button onClick={() => setToast({ show: false, msg: '' })} className="ml-4 text-emerald-200 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
            )}

            {currentView === 'list' && (
                <AtendimentosList
                    data={atendimentosData}
                    globalEducandos={globalEducandos}
                    onCreate={() => { setSelectedId(null); setCurrentView('form') }}
                    onEdit={(id: string) => { setSelectedId(id); setCurrentView('form') }}
                />
            )}

            {currentView === 'form' && (
                <AtendimentoForm
                    initialData={activeAtendimento}
                    globalEducandos={globalEducandos}
                    onBack={() => setCurrentView('list')}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: LIST
// ----------------------------------------------------
function AtendimentosList({ data, globalEducandos, onCreate, onEdit }: any) {
    const [searchName, setSearchName] = useState('');
    const [filterAcesso, setFilterAcesso] = useState('Todos');
    const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean, data: Atendimento | null }>({ isOpen: false, data: null });

    const joinedData = useMemo(() => {
        return data.map((atendimento: Atendimento) => {
            const student = globalEducandos.find((e: any) => e.id === atendimento.educandoId);
            return { ...atendimento, studentName: student ? student.nome : 'Educando Removido' };
        });
    }, [data, globalEducandos]);

    const filtered = joinedData.filter((item: any) => {
        const matchName = item.studentName.toLowerCase().includes(searchName.toLowerCase());
        const matchAcesso = filterAcesso === 'Todos' || item.nivelAcesso === filterAcesso;
        return matchName && matchAcesso;
    });

    const loggedProfessional = "Ana Silva - Assistente Social"; // Mock authentication

    const formatDateBR = (dateStr: string) => {
        if (!dateStr) return '--';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Realizado': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
            case 'Em Acompanhamento': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
            case 'Finalizado': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
            case 'Cancelado (Erro de Registro)': return 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border dashed border-slate-300 dark:border-slate-600';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Registro de Atendimentos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Prontuário eletrônico e acompanhamento técnico.</p>
                </div>
                <button onClick={onCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all w-full sm:w-auto">
                    <Plus className="w-5 h-5" /> Novo Atendimento
                </button>
            </div>

            {/* Tabela + Filtros */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="Buscar pelo nome do educando..."
                            className="pl-9 pr-4 py-2.5 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-200 shadow-sm"
                        />
                    </div>
                    <div className="relative w-full md:w-64">
                        <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterAcesso}
                            onChange={e => setFilterAcesso(e.target.value)}
                            className="pl-9 pr-4 py-2.5 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-200 shadow-sm appearance-none"
                        >
                            <option value="Todos">Nível de Acesso (Todos)</option>
                            <option value="Público">Somente Públicos</option>
                            <option value="Confidencial">Somente Confidenciais</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Educando/Família</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 hidden md:table-cell">Profissional</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Acesso</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filtered.map((row: any) => {
                                const isConfidential = row.nivelAcesso === 'Confidencial';
                                const canView = !isConfidential || row.profissional === loggedProfessional;
                                const isCancelled = row.status === 'Cancelado (Erro de Registro)';

                                return (
                                    <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${isCancelled ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                                        <td className={`px-6 py-4 font-medium min-w-[110px] ${isCancelled ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700' : 'text-slate-900 dark:text-slate-200'}`}>{formatDateBR(row.data)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCancelled ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'}`}>
                                                    {row.studentName.charAt(0)}
                                                </div>
                                                <span className={`font-bold line-clamp-1 ${isCancelled ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700' : 'text-slate-900 dark:text-slate-200'}`}>{row.studentName}</span>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 font-medium ${isCancelled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>{row.tipo}</td>
                                        <td className={`px-6 py-4 hidden md:table-cell ${isCancelled ? 'text-slate-400/70 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>{row.profissional}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${getStatusBadge(row.status)}`}>{row.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isConfidential ? (
                                                <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border ${isCancelled ? 'bg-rose-50 border-rose-100 text-rose-300 dark:bg-rose-950/20 dark:border-rose-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'}`}>
                                                    <Lock className="w-3 h-3" /> Confidencial
                                                </div>
                                            ) : (
                                                <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border ${isCancelled ? 'bg-sky-50 border-sky-100 text-sky-400 dark:bg-sky-950/20 dark:border-sky-900/30' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'}`}>
                                                    <Unlock className="w-3 h-3" /> Público
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => canView && setDetailsModal({ isOpen: true, data: row })}
                                                    disabled={!canView}
                                                    title="Ver Relatório"
                                                    className={`p-2 rounded-lg transition-all ${canView ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'}`}
                                                >
                                                    {canView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => canView && onEdit(row.id)}
                                                    disabled={!canView}
                                                    title="Editar Atendimento"
                                                    className={`p-2 rounded-lg transition-all ${canView ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">Nenhum atendimento encontrado com os filtros atuais.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAILS MODAL */}
            {detailsModal.isOpen && detailsModal.data && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className={`p-6 border-b flex justify-between items-start rounded-t-2xl ${detailsModal.data.nivelAcesso === 'Confidencial' ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-800'}`}>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Detalhes do Atendimento</h2>
                                    {detailsModal.data.nivelAcesso === 'Confidencial' && <span className="bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1"><Lock className="w-3 h-3" /> Sigiloso</span>}
                                    {detailsModal.data.status === 'Cancelado (Erro de Registro)' && <span className="bg-slate-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Cancelado</span>}
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Realizado em {formatDateBR(detailsModal.data.data)} por {detailsModal.data.profissional}
                                </p>
                            </div>
                            <button onClick={() => setDetailsModal({ isOpen: false, data: null })} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
                        </div>

                        <div className={`p-6 overflow-y-auto flex-1 space-y-6 ${detailsModal.data.status === 'Cancelado (Erro de Registro)' ? 'opacity-70' : ''}`}>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1 block">Educando / Família</label>
                                    <p className="text-base font-bold text-slate-900 dark:text-white">{(detailsModal.data as any).studentName}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1 block">Tipo de Atendimento</label>
                                    <p className="text-base font-medium text-slate-800 dark:text-slate-200">{detailsModal.data.tipo}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2 block">Relato Técnico</label>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 leading-relaxed min-h-[100px] whitespace-pre-wrap">
                                    {detailsModal.data.descricao || "Nenhum relato preenchido."}
                                </div>
                            </div>

                            {(detailsModal.data.encaminhamento || detailsModal.data.status) && (
                                <div className="grid grid-cols-2 gap-6 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    {detailsModal.data.encaminhamento && (
                                        <div>
                                            <label className="text-xs uppercase tracking-wider font-bold text-indigo-800/70 dark:text-indigo-400/80 mb-1 block">Encaminhamentos</label>
                                            <p className="font-bold text-indigo-900 dark:text-indigo-300">{detailsModal.data.encaminhamento}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs uppercase tracking-wider font-bold text-indigo-800/70 dark:text-indigo-400/80 mb-1 block">Status</label>
                                        <p className={`font-bold ${detailsModal.data.status === 'Cancelado (Erro de Registro)' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-900 dark:text-indigo-300'}`}>{detailsModal.data.status}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ----------------------------------------------------
// SUB-COMPONENT: FORM
// ----------------------------------------------------
function AtendimentoForm({ initialData, globalEducandos, onBack, onSave }: any) {
    const defaultProfissional = "Ana Silva - Assistente Social";
    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState<Atendimento>(initialData || {
        id: Date.now().toString(),
        data: today,
        educandoId: '',
        profissional: defaultProfissional,
        tipo: 'Orientação Familiar',
        descricao: '',
        encaminhamento: '',
        status: 'Realizado',
        nivelAcesso: 'Público'
    });

    const initStudent = globalEducandos.find((e: any) => e.id === form.educandoId);
    const [searchEdu, setSearchEdu] = useState(initStudent ? initStudent.nome : '');
    const [showDropdown, setShowDropdown] = useState(false);

    const filteredStudents = useMemo(() => {
        return globalEducandos.filter((e: any) => e.nome.toLowerCase().includes(searchEdu.toLowerCase())).slice(0, 5);
    }, [globalEducandos, searchEdu]);

    const handleSelectStudent = (id: string, name: string) => {
        setForm({ ...form, educandoId: id });
        setSearchEdu(name);
        setShowDropdown(false);
    };

    const isFormValid = form.data !== '' && form.educandoId !== '' && form.tipo !== '' && form.descricao.trim().length > 5;
    const isCancelled = form.status === 'Cancelado (Erro de Registro)';

    return (
        <div className="max-w-6xl mx-auto w-full space-y-6 animate-in fade-in pb-12">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {initialData ? `Editar Atendimento: ${formatDateBR(form.data)}` : 'Registrar Novo Atendimento'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {initialData ? 'Altere as informações abaixo para corrigir o prontuário. Exclusões são proibidas por segurança.' : 'Preencha o formulário técnico abaixo com atenção à regra de sigilo profissional.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 relative z-10">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2"><User className="w-5 h-5" /> Vínculo & Contexto</h3>

                        <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Educando/Família Referência <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchEdu}
                                    onChange={e => { setSearchEdu(e.target.value); setShowDropdown(true); setForm({ ...form, educandoId: '' }) }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="Buscar pelo nome do educando..."
                                    className="pl-9 pr-4 py-3 w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 shadow-sm transition-all"
                                />
                            </div>

                            {showDropdown && searchEdu.trim() !== '' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                                    {filteredStudents.length > 0 ? filteredStudents.map((s: any) => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleSelectStudent(s.id, s.nome)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                        >
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{s.nome}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{s.nucleoFamiliar?.responsavel}</p>
                                        </button>
                                    )) : (
                                        <div className="p-4 text-sm text-slate-500 text-center">Nenhum educando encontrado.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Data <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="pl-9 pr-4 py-3 w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 outline-none dark:text-slate-200 shadow-sm cursor-pointer" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Status <span className="text-rose-500">*</span></label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 outline-none dark:text-slate-200 shadow-sm appearance-none cursor-pointer ${isCancelled ? 'text-red-600 font-bold border-red-300' : ''}`}>
                                    <option value="Realizado">Realizado</option>
                                    <option value="Em Acompanhamento">Em Acompanhamento</option>
                                    <option value="Finalizado">Finalizado</option>
                                    <option value="Cancelado (Erro de Registro)">Cancelado (Erro de Reg.)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tipo de Atendimento <span className="text-rose-500">*</span></label>
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 outline-none dark:text-slate-200 shadow-sm appearance-none cursor-pointer">
                                <option value="Orientação Familiar">Orientação Familiar</option>
                                <option value="Visita Domiciliar">Visita Domiciliar</option>
                                <option value="Escuta Psicológica">Escuta Psicológica</option>
                                <option value="Atendimento Individual">Atendimento Individual</option>
                                <option value="Atendimento Coletivo">Atendimento Coletivo</option>
                            </select>
                        </div>

                        <div className="space-y-2 opacity-60">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Profissional</label>
                            <input type="text" readOnly value={form.profissional} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 rounded-xl text-sm cursor-not-allowed dark:text-slate-400 font-medium" />
                        </div>

                    </div>
                </div>

                <div className="lg:col-span-7 space-y-6 flex flex-col h-full">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 flex-1 flex flex-col">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Conteúdo Técnico
                        </h3>

                        <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Relato do Atendimento <span className="text-rose-500">*</span></label>
                            <textarea
                                value={form.descricao}
                                onChange={e => setForm({ ...form, descricao: e.target.value })}
                                placeholder="Descreva detalhadamente o atendimento realizado, as demandas observadas e as intervenções técnicas aplicadas..."
                                className={`w-full p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 shadow-sm resize-none flex-1 min-h-[160px] ${isCancelled ? 'opacity-50 line-through' : ''}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Encaminhamentos Relacionados <span className="text-slate-400 font-normal">(Opcional)</span></label>
                            <input
                                type="text"
                                value={form.encaminhamento}
                                onChange={e => setForm({ ...form, encaminhamento: e.target.value })}
                                placeholder="Ex: CRAS, Conselho Tutelar, UBS, CAPSI..."
                                className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 outline-none dark:text-slate-200 shadow-sm ${isCancelled ? 'opacity-50' : ''}`}
                            />
                        </div>

                        <div className={`pt-6 border-t border-slate-100 dark:border-slate-800 ${isCancelled ? 'opacity-50' : ''}`}>
                            <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><ShieldAlert className="w-5 h-5 text-indigo-500" /> Regra de Sigilo e Nível de Acesso <span className="text-rose-500">*</span></label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <label className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col gap-2 ${form.nivelAcesso === 'Público' ? 'bg-sky-50 border-sky-500 dark:bg-sky-500/10 dark:border-sky-500 shadow-md' : 'bg-white border-slate-200 hover:border-sky-300 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-2 text-sky-900 dark:text-sky-300"><Unlock className="w-5 h-5" /> Público</span>
                                        <input type="radio" name="acesso" checked={form.nivelAcesso === 'Público'} onChange={() => !isCancelled && setForm({ ...form, nivelAcesso: 'Público' })} disabled={isCancelled} className="w-5 h-5 text-sky-600 focus:ring-sky-500 rounded-full border-slate-300 cursor-pointer" />
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-1">Visível para toda a equipe. Uso geral e administrativo.</p>
                                </label>

                                <label className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col gap-2 ${form.nivelAcesso === 'Confidencial' ? 'bg-rose-50 border-rose-500 dark:bg-rose-500/10 dark:border-rose-500 shadow-md' : 'bg-white border-slate-200 hover:border-rose-300 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-2 text-rose-800 dark:text-rose-300"><Lock className="w-5 h-5" /> Confidencial</span>
                                        <input type="radio" name="acesso" checked={form.nivelAcesso === 'Confidencial'} onChange={() => !isCancelled && setForm({ ...form, nivelAcesso: 'Confidencial' })} disabled={isCancelled} className="w-5 h-5 text-rose-600 focus:ring-rose-500 rounded-full border-slate-300 cursor-pointer" />
                                    </div>
                                    <p className="text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed font-medium mt-1">Registro sigiloso restrito à Equipe Técnica validada.</p>
                                </label>

                            </div>
                        </div>

                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        {!isFormValid && <span className="text-sm text-slate-500 dark:text-slate-400 mr-auto flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Preencha os campos vitais para salvar.</span>}
                        <button onClick={onBack} className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={() => isFormValid && onSave({ ...form })}
                            disabled={!isFormValid}
                            className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all focus:ring-4 ${isCancelled ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-rose-900/20 focus:ring-rose-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-900/20 focus:ring-indigo-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isCancelled ? 'Invalidar Registro' : (initialData ? 'Salvar Alterações' : 'Salvar Atendimento')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Utility embedded
function formatDateBR(dateStr: string) {
    if (!dateStr) return '--';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}
