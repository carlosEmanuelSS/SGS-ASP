import { storageService } from './storage';
import { Educando, Oficina } from '../types/models';

export const businessRules = {
    // --- EDUCANDOS ---
    
    // Novo educando entra como lista_espera
    prepareNovoEducando: (dadosParciais: Omit<Educando, 'id' | 'status'>): Educando => {
        return {
            ...dadosParciais,
            id: Date.now().toString(),
            status: 'lista_espera'
        };
    },

    // Apenas educandos ativos aparecem para matrícula
    getEducandosParaMatricula: (): Educando[] => {
        const todos = storageService.getEducandos();
        return todos.filter(e => e.status === 'ativo');
    },

    // Soft delete: não apagar registros, apenas marcar como inativo
    inativarEducando: (id: string): void => {
        const todos = storageService.getEducandos();
        const atualizados = todos.map(e => e.id === id ? { ...e, status: 'inativo' as const } : e);
        storageService.saveEducandos(atualizados);
    },

    // --- OFICINAS ---

    // Oficina não pode ultrapassar o limite de vagas
    podeMatricular: (oficina: Oficina): boolean => {
        const ocupadas = oficina.educandosMatriculados.length;
        const limite = parseInt(oficina.limiteVagas, 10) || 0;
        return ocupadas < limite;
    },

    realizarMatricula: (educandoId: string, oficinaId: string): { success: boolean; message: string } => {
        const oficinas = storageService.getOficinas();
        const educandos = storageService.getEducandos();
        
        const oficina = oficinas.find(o => o.id === oficinaId);
        const educando = educandos.find(e => e.id === educandoId);

        if (!oficina) return { success: false, message: 'Oficina não encontrada.' };
        if (!educando) return { success: false, message: 'Educando não encontrado.' };
        if (educando.status !== 'ativo') return { success: false, message: 'Educando não está ativo.' };
        if (!businessRules.podeMatricular(oficina)) return { success: false, message: 'Limite de vagas atingido.' };
        if (oficina.educandosMatriculados.includes(educandoId)) return { success: false, message: 'Educando já matriculado.' };

        // Vincula na oficina
        oficina.educandosMatriculados.push(educandoId);
        storageService.saveOficinas(oficinas);

        // Vincula no educando
        educando.oficinasVinculadas.push(oficinaId);
        storageService.saveEducandos(educandos);

        return { success: true, message: 'Matrícula realizada com sucesso.' };
    },

    // Frequência deve considerar apenas educandos matriculados (ativos na oficina)
    getEducandosNaOficina: (oficinaId: string): Educando[] => {
        const oficinas = storageService.getOficinas();
        const educandos = storageService.getEducandos();
        
        const oficina = oficinas.find(o => o.id === oficinaId);
        if (!oficina) return [];

        return educandos.filter(e => oficina.educandosMatriculados.includes(e.id) && e.status === 'ativo');
    },

    // --- DASHBOARD E RELATÓRIOS ---
    
    // Dashboard deve calcular os indicadores com base nos dados reais/simulados
    calcularMetricasDashboard: () => {
        const educandos = storageService.getEducandos();
        const oficinas = storageService.getOficinas();
        const atendimentos = storageService.getAtendimentos();

        const totalAtivos = educandos.filter(e => e.status === 'ativo').length;
        const totalListaEspera = educandos.filter(e => e.status === 'lista_espera').length;
        const totalOficinas = oficinas.length;
        
        const totalVagas = oficinas.reduce((acc, curr) => acc + (parseInt(curr.limiteVagas) || 0), 0);
        const vagasOcupadas = oficinas.reduce((acc, curr) => acc + curr.educandosMatriculados.length, 0);
        
        const taxaOcupacao = totalVagas > 0 ? Math.round((vagasOcupadas / totalVagas) * 100) : 0;
        const totalAtendimentos = atendimentos.filter(a => a.status === 'ativo').length;

        return {
            totalAtivos,
            totalListaEspera,
            totalOficinas,
            taxaOcupacao,
            totalAtendimentos,
            vagasOcupadas,
            totalVagas
        };
    },

    gerarOcupacaoPorOficina: () => {
        const oficinas = storageService.getOficinas();
        return oficinas.map(ofi => ({
            name: ofi.nome,
            matriculados: ofi.educandosMatriculados?.length || 0,
            vagasRestantes: Math.max(0, (parseInt(ofi.limiteVagas) || 0) - (ofi.educandosMatriculados?.length || 0)),
            vagasTotais: parseInt(ofi.limiteVagas) || 0
        }));
    },

    getEducandosComRiscoEvasao: () => {
        // Mapear histórico real de chamadas
        const frequencias = storageService.getFrequencias();
        const educandos = storageService.getEducandos();
        const oficinas = storageService.getOficinas();
        
        // Estrutura para contar faltas
        const faltasPorAluno: Record<string, number> = {};
        
        frequencias.forEach(chamada => {
            Object.entries(chamada.registros).forEach(([alunoId, registro]) => {
                if (!registro.presente) {
                    faltasPorAluno[alunoId] = (faltasPorAluno[alunoId] || 0) + 1;
                }
            });
        });

        // Retornar apenas alunos com >= 3 faltas
        const alertas = [];
        for (const [id, faltas] of Object.entries(faltasPorAluno)) {
            if (faltas >= 3) {
                const educando = educandos.find(e => e.id === id);
                if (educando && educando.status === 'ativo') {
                    // Encontrar a oficina principal (primeira vinculada)
                    const ofiId = educando.oficinasVinculadas[0];
                    const oficinaNome = ofiId ? oficinas.find(o => o.id === ofiId)?.nome || 'Sem Oficina' : 'Sem Oficina';
                    
                    alertas.push({
                        id: educando.id,
                        nome: educando.nome,
                        oficina: oficinaNome,
                        faltas: faltas,
                        telefone: educando.nucleoFamiliar?.telefone || 'Não informado',
                        status: faltas >= 5 ? 'Risco Alto' : 'Atenção'
                    });
                }
            }
        }
        
        return alertas.sort((a, b) => b.faltas - a.faltas);
    },

    gerarDadosDemograficos: () => {
        const educandos = storageService.getEducandos().filter(e => e.status === 'ativo');
        
        const faixas = {
            '7 a 10 anos': 0,
            '11 a 14 anos': 0,
            '15 a 17 anos': 0,
            '18+ anos': 0
        };

        const hoje = new Date();
        educandos.forEach(e => {
            if (e.dadosPessoais?.dataNascimento) {
                const nasc = new Date(e.dadosPessoais.dataNascimento);
                let idade = hoje.getFullYear() - nasc.getFullYear();
                const m = hoje.getMonth() - nasc.getMonth();
                if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
                    idade--;
                }
                
                if (idade >= 7 && idade <= 10) faixas['7 a 10 anos']++;
                else if (idade >= 11 && idade <= 14) faixas['11 a 14 anos']++;
                else if (idade >= 15 && idade <= 17) faixas['15 a 17 anos']++;
                else if (idade >= 18) faixas['18+ anos']++;
            }
        });

        return [
            { name: '7 a 10 anos', value: faixas['7 a 10 anos'] },
            { name: '11 a 14 anos', value: faixas['11 a 14 anos'] },
            { name: '15 a 17 anos', value: faixas['15 a 17 anos'] },
            { name: '18+ anos', value: faixas['18+ anos'] }
        ].filter(f => f.value > 0); // Omitir faixas vazias se preferir, ou manter para o gráfico
    },

    // --- ATENDIMENTOS ---
    
    getAtendimentosAtivos: () => {
        return storageService.getAtendimentos().filter(a => a.status === 'ativo');
    },

    getAtendimentosPorEducando: (educandoId: string) => {
        return storageService.getAtendimentos().filter(a => a.educandoId === educandoId);
    },

    cancelarAtendimento: (id: string, motivo: string = '') => {
        const atendimentos = storageService.getAtendimentos();
        const atualizados = atendimentos.map(a => 
            a.id === id ? { ...a, status: 'cancelado' as const, motivoCancelamento: motivo, updatedAt: new Date().toISOString() } : a
        );
        storageService.saveAtendimentos(atualizados);
    },

    gerarResumoAtendimentos: () => {
        const atendimentos = storageService.getAtendimentos().filter(a => a.status === 'ativo');
        const tipos: Record<string, number> = {};
        
        atendimentos.forEach(a => {
            tipos[a.tipo] = (tipos[a.tipo] || 0) + 1;
        });

        return Object.entries(tipos)
            .map(([tipo, qtde]) => ({ tipo, qtde }))
            .sort((a, b) => b.qtde - a.qtde);
    }
};
