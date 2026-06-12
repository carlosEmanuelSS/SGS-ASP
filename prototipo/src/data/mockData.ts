import { Educando, Oficina, Atendimento, ChamadaHistorico, Usuario } from '../types/models';

export const mockEducandos: Educando[] = [
    {
        id: '1',
        nome: 'Carlos Almeida',
        status: 'ativo',
        dadosPessoais: { dataNascimento: '2009-05-12', cpf: '123.456.789-00', matriculaEscolar: '9º Ano - EE. Marechal' },
        nucleoFamiliar: { responsavel: 'Maria Almeida', grauParentesco: 'Mãe', telefone: '(11) 98765-4321', renda: 'R$ 1.500' },
        socialDocs: { programasSociais: true, observacoes: 'Família acompanhada pelo CRAS. Vulnerabilidade moderada.' },
        oficinasVinculadas: ['1', '2']
    },
    {
        id: '2',
        nome: 'Ana Beatriz Silva',
        status: 'ativo',
        dadosPessoais: { dataNascimento: '2008-08-22', cpf: '987.654.321-11', matriculaEscolar: '1º Ano EM' },
        nucleoFamiliar: { responsavel: 'João Silva', grauParentesco: 'Pai', telefone: '(11) 91234-5678', renda: 'R$ 2.100' },
        socialDocs: { programasSociais: false, observacoes: 'Nenhuma observação relevante.' },
        oficinasVinculadas: ['3']
    },
    {
        id: '3',
        nome: 'Lucas Souza',
        status: 'lista_espera',
        dadosPessoais: { dataNascimento: '2010-02-15', cpf: '111.222.333-44', matriculaEscolar: '8º Ano' },
        nucleoFamiliar: { responsavel: 'Marta Souza', grauParentesco: 'Avó', telefone: '(11) 99999-8888', renda: 'R$ 1.200' },
        socialDocs: { programasSociais: true, observacoes: 'Aguardando vaga.' },
        oficinasVinculadas: []
    }
];

export const mockOficinas: Oficina[] = [
    {
        id: '1',
        nome: 'Informática Básica',
        tipo: 'Educação',
        educadorResponsavel: 'Prof. Roberto (TI)',
        limiteVagas: '20',
        diasSemana: ['Segunda', 'Quarta'],
        turno: 'Tarde',
        unidade: 'Sede Central',
        educandosMatriculados: ['1', '2'],
        faixaEtaria: '12 a 16 anos',
        descricao: 'Introdução à informática.',
        horarios: '14:00 às 16:00'
    },
    {
        id: '2',
        nome: 'Futebol e Cidadania',
        tipo: 'Esporte',
        educadorResponsavel: 'Prof. Mário (Ed. Física)',
        limiteVagas: '2',
        diasSemana: ['Terça', 'Quinta'],
        turno: 'Manhã',
        unidade: 'Quadra Esportiva Norte',
        educandosMatriculados: ['1', '2'],
        faixaEtaria: '10 a 15 anos',
        descricao: 'Treinos táticos, físicos e cidadania.',
        horarios: '08:30 às 10:30'
    }
];

export const mockAtendimentos: Atendimento[] = [
    {
        id: '1',
        data: '2026-03-22',
        educandoId: '1',
        profissional: 'Ana Silva - Assistente Social',
        tipo: 'social',
        descricao: 'Família compareceu para orientação sobre atualização do CadÚnico. Relatou dificuldades financeiras recentes. Encaminhada para o CRAS Norte para solicitar cesta básica.',
        encaminhamento: 'CRAS Norte',
        status: 'ativo',
        nivelAcesso: 'publico'
    },
    {
        id: '12399',
        data: '2026-03-20',
        educandoId: '1',
        profissional: 'Ana Silva - Assistente Social',
        tipo: 'visita_domiciliar',
        descricao: 'Visita agendada, porém a família não se encontrava na residência. Vizinhos informaram que eles saíram cedo. Tentar reagendar na próxima semana.',
        encaminhamento: '',
        status: 'cancelado',
        motivoCancelamento: 'Família não estava no local',
        nivelAcesso: 'publico'
    },
    {
        id: '2',
        data: '2026-03-18',
        educandoId: '2',
        profissional: 'Dr. Marcos - Psicólogo',
        tipo: 'psicologico',
        descricao: 'Sessão individual com a educanda. Abordou temas sensíveis sobre o convívio escolar. Apresenta melhora na regulação emocional.',
        encaminhamento: 'CAPS Infantil (Acompanhamento contínuo)',
        status: 'ativo',
        nivelAcesso: 'confidencial'
    }
];

export const mockFrequencias: ChamadaHistorico[] = [];

export const mockUsuarioLogado: Usuario = {
    id: 'u1',
    nome: 'Ana Silva - Assistente Social',
    cargo: 'Assistente Social',
    perfil: 'tecnico'
};
