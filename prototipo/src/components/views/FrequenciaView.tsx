import { useState, useEffect, useMemo } from 'react';
import { Calendar, ArrowLeft, Users, CheckSquare, X, ListTodo, CheckCircle2, XCircle } from 'lucide-react';

export function FrequenciaView() {
    const [frequenciaView, setFrequenciaView] = useState<'select-class' | 'take-attendance'>('select-class');
    const [dataChamada, setDataChamada] = useState(new Date().toISOString().split('T')[0]);
    const [selectedOficinaId, setSelectedOficinaId] = useState<string | null>(null);

    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });

    // Integration with Global State
    const [oficinas, setOficinas] = useState<any[]>([]);
    const [educandos, setEducandos] = useState<any[]>([]);

    useEffect(() => {
        const savedOfi = localStorage.getItem('sgs_oficinas_db');
        if (savedOfi) setOficinas(JSON.parse(savedOfi));
        const savedEdu = localStorage.getItem('sgs_educandos_db');
        if (savedEdu) setEducandos(JSON.parse(savedEdu));
    }, []);

    // Attendance State (key = student ID)
    const [chamada, setChamada] = useState<{
        [id: string]: { presente: boolean, justificativa: string }
    }>({});

    const handleSelectOficina = (id: string) => {
        const oficina = oficinas.find(o => o.id === id);
        if (!oficina) return;

        // Golden UX Rule: Everyone is present by default
        const initialState: any = {};
        oficina.educandosMatriculados.forEach((studentId: string) => {
            initialState[studentId] = { presente: true, justificativa: '' };
        });

        setChamada(initialState);
        setSelectedOficinaId(id);
        setFrequenciaView('take-attendance');
    };

    const handleTogglePresenca = (studentId: string, presente: boolean) => {
        setChamada(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], presente, justificativa: presente ? '' : prev[studentId].justificativa }
        }));
    };

    const handleUpdateJustificativa = (studentId: string, texto: string) => {
        setChamada(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], justificativa: texto }
        }));
    };

    const activeOficina = useMemo(() => oficinas.find(o => o.id === selectedOficinaId), [oficinas, selectedOficinaId]);

    // Derived data for the active class list
    const activeStudentsList = useMemo(() => {
        if (!activeOficina) return [];
        return activeOficina.educandosMatriculados.map((id: string) => {
            const student = educandos.find(e => e.id === id);
            return student || { id, nome: 'Aluno Não Encontrado (Removido)' };
        });
    }, [activeOficina, educandos]);

    const totalPresentes = Object.values(chamada).filter(x => x.presente).length;
    const totalFaltas = Object.values(chamada).filter(x => !x.presente).length;

    const handleSave = () => {
        setToast({ show: true, msg: 'Frequência registrada com sucesso no histórico dos educandos!' });
        setTimeout(() => {
            setToast({ show: false, msg: '' });
        }, 4000);
        setFrequenciaView('select-class');
        setSelectedOficinaId(null);
    };

    // Helper date formatter
    const formatDateBR = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="animate-in fade-in duration-300 relative pb-24 h-full flex flex-col">
            {/* GLOBAL TOAST */}
            {toast.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 z-50">
                    <CheckSquare className="w-6 h-6 shrink-0" />
                    <p className="font-semibold text-sm md:text-base">{toast.msg}</p>
                    <button onClick={() => setToast({ show: false, msg: '' })} className="ml-4 text-emerald-200 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
            )}

            {/* VIEW A: SELECIONAR TURMA */}
            {frequenciaView === 'select-class' && (
                <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto w-full">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <ListTodo className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                    Diário de Classe
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Registro rápido de frequência das oficinas ativas.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 w-full md:w-auto">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Data da Chamada</label>
                                <div className="relative">
                                    <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                                    <input
                                        type="date"
                                        value={dataChamada}
                                        onChange={(e) => setDataChamada(e.target.value)}
                                        className="pl-10 pr-4 py-2 w-full md:w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 cursor-pointer shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">Selecione a Turma <span className="font-normal text-slate-400 text-sm">({oficinas.length} opções)</span></h2>
                        {oficinas.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                                <p className="text-slate-500 dark:text-slate-400">Nenhuma oficina cadastrada no sistema ainda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {oficinas.map(ofi => (
                                    <div key={ofi.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1 flex-1 pr-4">{ofi.nome}</h3>
                                            <span className="shrink-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md font-semibold border border-slate-200 dark:border-slate-700">
                                                {ofi.turno}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-8">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                <strong className="text-slate-900 dark:text-slate-200">{ofi.educandosMatriculados.length}</strong> alunos matriculados
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleSelectOficina(ofi.id)}
                                            disabled={ofi.educandosMatriculados.length === 0}
                                            className="mt-auto w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-500/10 dark:hover:bg-indigo-500 dark:text-indigo-400 dark:hover:text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed group-hover:ring-2 group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900/50"
                                        >
                                            {ofi.educandosMatriculados.length === 0 ? 'Turma Vazia' : 'Fazer Chamada'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW B: FAZER CHAMADA */}
            {frequenciaView === 'take-attendance' && activeOficina && (
                <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col animate-in slide-in-from-right-8">

                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <button onClick={() => { setFrequenciaView('select-class'); setSelectedOficinaId(null) }} className="p-2 -ml-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 self-start">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Chamada: {activeOficina.nome}</h1>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1">Dia {formatDateBR(dataChamada)} • {activeOficina.turno}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex-1 mb-24">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lista de Alunos</span>
                            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-3 py-1 rounded-full font-bold">{activeStudentsList.length} Alunos</span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeStudentsList.map((student: any) => {
                                const status = chamada[student.id] || { presente: true, justificativa: '' };
                                const isPresent = status.presente;

                                return (
                                    <div key={student.id} className={`p-4 sm:p-5 transition-colors ${!isPresent ? 'bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-10 h-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                                    {student.nome.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{student.nome}</p>
                                                </div>
                                            </div>

                                            {/* UX Optimized Toggle Group */}
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                                                <button
                                                    onClick={() => handleTogglePresenca(student.id, true)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isPresent ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                                                >
                                                    <CheckCircle2 className={`w-4 h-4 ${isPresent ? 'text-emerald-500' : ''}`} />
                                                    Presente
                                                </button>
                                                <button
                                                    onClick={() => handleTogglePresenca(student.id, false)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isPresent ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                                                >
                                                    <XCircle className={`w-4 h-4 ${!isPresent ? 'text-red-500' : ''}`} />
                                                    Falta
                                                </button>
                                            </div>
                                        </div>

                                        {/* Smoothly expand justification field if absent */}
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out pl-[56px] ${!isPresent ? 'max-h-32 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                                            <input
                                                type="text"
                                                value={status.justificativa}
                                                onChange={(e) => handleUpdateJustificativa(student.id, e.target.value)}
                                                placeholder="Justificativa da falta (Opcional - Ex: Atestado médico, problema familiar)..."
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-200 shadow-sm transition-shadow"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* FLOATING ACTION BOTTOM PANEL */}
                    <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40 animate-in slide-in-from-bottom">
                        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resumo</span>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {totalPresentes} Presentes</span>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-red-600 dark:text-red-400"><XCircle className="w-4 h-4" /> {totalFaltas} Faltas</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all hover:-translate-y-0.5"
                            >
                                Salvar Frequência
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
