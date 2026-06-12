import { useState, useEffect } from 'react';
import { Download, Filter, Users, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, AlertCircle } from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { businessRules } from '../../services/businessRules';

export function RelatoriosView() {
    const [activeTab, setActiveTab] = useState<'geral' | 'frequencia' | 'atendimentos'>('geral');

    const [metricas, setMetricas] = useState(businessRules.calcularMetricasDashboard());
    const [demografiaData, setDemografiaData] = useState<any[]>([]);
    const [oficinasOcupacao, setOficinasOcupacao] = useState<any[]>([]);
    const [alertasEvasao, setAlertasEvasao] = useState<any[]>([]);
    const [atendimentosTipo, setAtendimentosTipo] = useState<any[]>([]);

    useEffect(() => {
        setMetricas(businessRules.calcularMetricasDashboard());
        setDemografiaData(businessRules.gerarDadosDemograficos());
        setOficinasOcupacao(businessRules.gerarOcupacaoPorOficina());
        setAlertasEvasao(businessRules.getEducandosComRiscoEvasao());
        setAtendimentosTipo(businessRules.gerarResumoAtendimentos());
    }, []);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

    // Mocks temporários para funcionalidades que ainda não têm histórico complexo (como "Evolução de 4 semanas" e "Encaminhamentos")
    const frequenciaEvolucao = [
        { semana: 'Semana 1', presencas: 0, faltas: 0 },
        { semana: 'Semana 2', presencas: 0, faltas: 0 },
        { semana: 'Semana 3', presencas: 0, faltas: 0 },
        { semana: 'Semana 4', presencas: 0, faltas: 0 },
    ];

    const encaminhamentos: any[] = [];

    // Tooltip customizado Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl">
                    <p className="font-bold text-slate-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-in fade-in duration-300 relative h-full flex flex-col space-y-6 pb-12 w-full max-w-7xl mx-auto">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Relatórios e Prestação de Contas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Dashboard Executivo para Direção e Coordenação Técnica.</p>
                </div>
                <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl font-bold shadow-lg transition-all w-full sm:w-auto">
                    <Download className="w-5 h-5" /> Exportar Relatório (PDF)
                </button>
            </div>

            {/* GLOBAL FILTERS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filtros Globais (RN25)
                    </h3>
                    <button className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-all">Limpar Filtros</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Período</label>
                        <div className="flex items-center gap-2">
                            <input type="date" defaultValue="2026-03-01" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200" />
                            <span className="text-slate-400 font-bold">Até</span>
                            <input type="date" defaultValue="2026-03-22" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Atividade / Oficina</label>
                        <select className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 appearance-none">
                            <option>Todas as Atividades</option>
                            <option>Informática</option>
                            <option>Futebol</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Educador(a) Resp.</label>
                        <select className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 appearance-none">
                            <option>Todos</option>
                            <option>Ana Silva</option>
                            <option>Dr. Marcos</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Polo de Atendimento</label>
                        <select className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 appearance-none">
                            <option>Sede Principal</option>
                            <option>Polo Norte</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button className="px-6 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl font-bold transition-all text-sm">Aplicar Filtros</button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl self-start overflow-x-auto w-full max-w-3xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab('geral')} className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'geral' ? 'bg-white shadow-md text-indigo-700 dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><PieChartIcon className="w-4 h-4" /> Visão Geral</button>
                <button onClick={() => setActiveTab('frequencia')} className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'frequencia' ? 'bg-white shadow-md text-indigo-700 dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><AlertTriangle className="w-4 h-4" /> Frequência e Evasão</button>
                <button onClick={() => setActiveTab('atendimentos')} className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'atendimentos' ? 'bg-white shadow-md text-indigo-700 dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Activity className="w-4 h-4" /> Atendimentos Téc.</button>
            </div>

            {/* TAB A: VISÃO GERAL */}
            {activeTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Total de Atendimentos</h4>
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400"><Users className="w-5 h-5" /></div>
                            </div>
                            <p className="text-4xl font-black text-slate-900 dark:text-white">{metricas.totalAtendimentos}</p>
                            <div className="flex items-center gap-2 mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-1 rounded">
                                <TrendingUp className="w-4 h-4" /> Métrica Real
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Educandos Ativos</h4>
                                <div className="p-2 bg-sky-50 dark:bg-sky-500/10 rounded-xl text-sky-600 dark:text-sky-400"><Users className="w-5 h-5" /></div>
                            </div>
                            <p className="text-4xl font-black text-slate-900 dark:text-white">{metricas.totalAtivos}</p>
                            <div className="flex items-center gap-2 mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-1 rounded">
                                <TrendingUp className="w-4 h-4" /> Métrica Real
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Ocupação de Vagas</h4>
                                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400"><PieChartIcon className="w-5 h-5" /></div>
                            </div>
                            <p className="text-4xl font-black text-slate-900 dark:text-white">{metricas.taxaOcupacao}<span className="text-2xl text-slate-400">%</span></p>
                            <div className="flex items-center gap-2 mt-4 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 w-fit px-2 py-1 rounded">
                                Base de Oficinas Real
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-96 flex flex-col">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Demografia por Faixa Etária</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={demografiaData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                                            {demografiaData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-96 flex flex-col">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Educandos por Oficina (Ocupação)</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={oficinasOcupacao} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#94a3b8', opacity: 0.1 }} />
                                        <Bar dataKey="matriculados" name="Matriculados" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB B: FREQUÊNCIA E EVASÃO */}
            {activeTab === 'frequencia' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-96 flex flex-col">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Evolução: Presenças vs Faltas (4 Semanas)</h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={frequenciaEvolucao} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36} />
                                    <Line type="monotone" dataKey="presencas" name="Presenças" stroke="#10b981" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="faltas" name="Faltas" stroke="#f43f5e" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-500" />
                            <div>
                                <h3 className="text-base font-bold text-rose-900 dark:text-rose-300">Educandos com Baixa Assiduidade</h3>
                                <p className="text-sm text-rose-700/70 dark:text-rose-400/80">Alerta Técnico: Mais de 3 faltas consecutivas. Risco de Evasão detetado.</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Educando</th>
                                        <th className="px-6 py-4">Oficina Principal</th>
                                        <th className="px-6 py-4 text-center">Faltas Acumuladas</th>
                                        <th className="px-6 py-4">Telefone (Resp.)</th>
                                        <th className="px-6 py-4 text-right">Ação Retentiva</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {alertasEvasao.map(alerta => (
                                        <tr key={alerta.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-200">{alerta.nome}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{alerta.oficina}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${alerta.status === 'Risco Alto' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}>
                                                    {alerta.faltas} faltas
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">{alerta.telefone}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-bold rounded-lg text-xs transition-all shadow-sm">
                                                    Notificar Assist. Social
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

            {/* TAB C: ATENDIMENTOS */}
            {activeTab === 'atendimentos' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-96 flex flex-col lg:col-span-1">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Volume por Serviço</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={atendimentosTipo} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis dataKey="tipo" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={90} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#94a3b8', opacity: 0.1 }} />
                                        <Bar dataKey="qtde" name="Qtd. Registros" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col lg:col-span-2">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Últimos Encaminhamentos Externos</h3>
                                <div className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 rounded-lg">Dados Auditáveis</div>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Educando</th>
                                            <th className="px-6 py-4">Técnico Analista</th>
                                            <th className="px-6 py-4">Órgão Destino</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {encaminhamentos.map(enc => (
                                            <tr key={enc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">{enc.data}</td>
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{enc.educando}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{enc.profissional}</td>
                                                <td className="px-6 py-4 font-bold text-indigo-700 dark:text-indigo-400">{enc.orgao}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${enc.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {enc.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}
