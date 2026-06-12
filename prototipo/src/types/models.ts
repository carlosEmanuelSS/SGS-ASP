export type StatusEducando = 'ativo' | 'inativo' | 'lista_espera';
export type StatusAtendimento = 'ativo' | 'cancelado';
export type NivelAcessoAtendimento = 'publico' | 'restrito' | 'confidencial';
export type TipoAtendimento = 'psicologico' | 'social' | 'visita_domiciliar' | 'encaminhamento' | 'outro';

export interface Educando {
    id: string;
    nome: string;
    status: StatusEducando;
    dadosPessoais: {
        dataNascimento: string;
        cpf: string;
        matriculaEscolar: string;
    };
    nucleoFamiliar: {
        responsavel: string;
        grauParentesco: string;
        telefone: string;
        renda: string;
    };
    socialDocs: {
        programasSociais: boolean;
        observacoes: string;
    };
    oficinasVinculadas: string[]; // IDs of Oficinas
}

export interface Oficina {
    id: string;
    nome: string;
    tipo: 'Esporte' | 'Cultura' | 'Educação' | 'Qualificação' | string;
    educadorResponsavel: string;
    limiteVagas: string; // string for compatibility with some string-based forms
    diasSemana: string[];
    turno: string;
    unidade: string;
    educandosMatriculados: string[];
    faixaEtaria: string;
    descricao: string;
    horarios: string;
}

export interface Atendimento {
    id: string;
    data: string; // YYYY-MM-DD
    educandoId: string;
    profissional: string;
    tipo: TipoAtendimento;
    descricao: string;
    encaminhamento: string;
    status: StatusAtendimento;
    nivelAcesso: NivelAcessoAtendimento;
    motivoCancelamento?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FrequenciaDiaria {
    presente: boolean;
    justificativa: string;
}

// Representa uma folha de chamada de um dia específico para uma oficina
export interface ChamadaHistorico {
    id: string;
    oficinaId: string;
    dataChamada: string; // YYYY-MM-DD
    registros: {
        [educandoId: string]: FrequenciaDiaria;
    };
}

export interface Usuario {
    id: string;
    nome: string;
    cargo: string;
    perfil: 'admin' | 'tecnico' | 'professor';
}
