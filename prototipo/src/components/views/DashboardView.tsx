import { useState, useEffect, useMemo } from 'react';
import { Users, Building, Activity, ClipboardList, Plus, AlertTriangle, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { businessRules } from '../../services/businessRules';
import { storageService } from '../../services/storage';

interface DashboardViewProps {
    onNavigate: (menu: 'dashboard' | 'educandos' | 'frequencia', educandosView?: 'list' | 'add' | 'details') => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
    const [metricas, setMetricas] = useState(businessRules.calcularMetricasDashboard());
    const [chartData, setChartData] = useState<{name: string, matriculados: number, vagasRestantes: number}[]>([]);
    const [alertasEvasao, setAlertasEvasao] = useState<any[]>([]);

    useEffect(() => {
        setMetricas(businessRules.calcularMetricasDashboard());
        setChartData(businessRules.gerarOcupacaoPorOficina().slice(0, 6));
        setAlertasEvasao(businessRules.getEducandosComRiscoEvasao());
    }, []);

    const alunosComFaltas = alertasEvasao.length;

    // 3. Atividades Recentes (Feed Real simplificado)
    const feedAtividades = useMemo(() => {
        const atividades = [];
        const educandos = storageService.getEducandos();
        const atendimentos = storageService.getAtendimentos();
        const oficinas = storageService.getOficinas();

        if (educandos.length > 0) {
            const edu = educandos[educandos.length - 1]; // Pegar o último inserido (geralmente final da array se não tiver sort)
            atividades.push({
                title: 'Último Educando Cadastrado',
                desc: `${edu.nome} foi registrado(a) no sistema.`,
                time: 'Atividade Recente',
                icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-500/20',
                timestamp: 3
            });
        }

        if (atendimentos.length > 0) {
            const atd = atendimentos[0];
            atividades.push({
                title: atd.status === 'cancelado' ? 'Atendimento Cancelado' : 'Último Atendimento',
                desc: `Registrado por ${atd.profissional} (${atd.tipo})`,
                time: 'Atividade Recente',
                icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-500/20',
                timestamp: 2
            });
        }

        if (oficinas.length > 0) {
            const ofi = oficinas[oficinas.length - 1];
            atividades.push({
                title: 'Última Oficina',
                desc: `Gestão da turma de ${ofi.nome}.`,
                time: 'Atividade Recente',
                icon: Building, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-500/20',
                timestamp: 1
            });
        }

        if (atividades.length === 0) {
            atividades.push({ title: 'Sistema Inicializado', desc: 'SGS ASP pronto para o primeiro registro.', time: 'Agora', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20', timestamp: 0 });
        }

        return atividades.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
    }, []);

    // Custom Tooltip Recharts
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-500" /> Visão Geral (Tempo Real)</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Conectado diretamente ao banco de dados LocalStorage.</p>
                </div>
            </div>

            {/* Metrics Cards (Dynamic calculations) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[
                    { label: 'Educandos Ativos', value: metricas.totalAtivos, icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    { label: 'Lista de Espera', value: metricas.totalListaEspera, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { label: 'Oficinas Ativas', value: metricas.totalOficinas, icon: Building, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
                    { label: 'Taxa Ocupação', value: `${metricas.taxaOcupacao}%`, icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'Atendimentos', value: metricas.totalAtendimentos, icon: ClipboardList, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button
                    onClick={() => onNavigate('educandos', 'add')}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4" /> Novo Educando
                </button>
                <button
                    onClick={() => onNavigate('dashboard')} // Fallback mock 
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-colors shadow-sm w-full sm:w-auto"
                >
                    <TrendingUp className="w-4 h-4" /> Relatório Completo
                </button>
            </div>

            {/* Intelligent Alert (Condicional) */}
            {alunosComFaltas > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 shadow-sm animate-in zoom-in-95">
                    <div className="flex items-center gap-3 sm:block">
                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
                            <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                        <h3 className="sm:hidden text-amber-800 dark:text-amber-300 font-bold text-lg mb-0">Atenção Crítica de Evasão</h3>
                    </div>
                    <div className="flex-1">
                        <h3 className="hidden sm:block text-amber-800 dark:text-amber-300 font-bold text-lg mb-1">Atenção Crítica de Evasão</h3>
                        <p className="text-amber-700 dark:text-amber-400/90 text-sm font-medium">
                            <strong className="text-amber-900 dark:text-amber-200">{alunosComFaltas} educandos</strong> estão com faltas recorrentes não justificadas e precisam de acompanhamento do Serviço Social.
                        </p>
                    </div>
                    <button onClick={() => onNavigate('frequencia')} className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm shadow-sm transition-colors mt-2 sm:mt-0 whitespace-nowrap">
                        Ver Frequências &rarr;
                    </button>
                </div>
            )}

            {/* Bottom Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                {/* Dynamic Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ocupação por Oficina (Tempo Real)</h3>
                        <span className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-bold uppercase tracking-wider">
                            Database Map
                        </span>
                    </div>

                    {chartData.length > 0 ? (
                        <div className="flex-1 min-h-0 w-full overflow-x-auto">
                            <div className="min-w-[400px] h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#94a3b8', opacity: 0.1 }} />
                                        <Bar dataKey="matriculados" stackId="a" name="Matriculados" fill="#6366f1" radius={[0, 0, 4, 4]} barSize={32} />
                                        <Bar dataKey="vagasRestantes" stackId="a" name="Vagas Livres" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                            Nenhuma oficina registrada no banco de dados.
                        </div>
                    )}
                </div>

                {/* Recent Activities Dynamic Feed */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> Log de Atividades</h3>
                    </div>
                    <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        {feedAtividades.map((act, i) => (
                            <div key={i} className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                                <div className={`p-3 rounded-xl mt-0.5 ${act.bg} ${act.color} shrink-0`}>
                                    <act.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">{act.title}</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">{act.desc}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{act.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
