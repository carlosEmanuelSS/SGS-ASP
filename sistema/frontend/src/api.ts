export type User = {
  pode_ver_atendimentos: boolean;
  pode_criar_atendimentos: boolean;
  pode_ler_restritos: boolean;
  pode_ver_doacoes: boolean;
  pode_criar_doacoes: boolean;
  pode_ver_indicadores: boolean;
  administrador: boolean;
  nome: string;
  pode_cadastrar: boolean;
  pode_editar: boolean;
  pode_ver_oficinas: boolean;
  pode_criar_oficinas: boolean;
  pode_editar_oficinas: boolean;
  pode_matricular: boolean;
  pode_cancelar_matricula: boolean;
  pode_ver_alunos: boolean;
  pode_ver_frequencia: boolean;
  pode_criar_chamada: boolean;
  pode_corrigir_chamada: boolean;
  pode_gerir_educadores: boolean;
};
export type Status = "lista_espera" | "ativo" | "inativo";
export type Cadastro = {
  nome: string;
  data_nascimento: string;
  cpf: string | null;
  matricula_escolar: string;
  responsavel: string;
  parentesco: string;
  telefone: string;
  renda_familiar: string | null;
  programas_sociais: boolean;
  observacoes: string;
};
export type Aluno = Cadastro & {
  id: string;
  status: Status;
  versao: number;
  criado_em: string;
  atualizado_em: string;
};
export type Ficha = Aluno & {
  frequencia: {
    total: number;
    presentes: number;
    faltas: number;
    registros: {
      data: string;
      oficina: string;
      turma: string;
      presente: boolean;
      justificativa: string;
    }[];
  };
  matriculas: {
    id: string;
    oficina: string;
    turma: string;
    ativa: boolean;
    criado_em: string;
    cancelado_em: string | null;
  }[];
  historico: {
    situacao_anterior: Status | "";
    situacao_nova: Status;
    acao: string;
    usuario: string;
    criado_em: string;
    campos: string[];
    motivo: string;
  }[];
};
export type Lista = {
  items: Aluno[];
  total: number;
  page: number;
  pages: number;
};
export const situacoes: Record<Status, string> = {
  lista_espera: "Lista de espera",
  ativo: "Ativo",
  inativo: "Inativo",
};
export let csrf = "";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    signal,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({
    error: "O servidor não respondeu corretamente. Tente novamente.",
  }));
  if (!response.ok) {
    if (response.status === 401 && path !== "login/")
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      data.error || "Não foi possível concluir a operação.",
      response.status,
      data.fields,
    );
  }
  if (data.csrf) csrf = data.csrf;
  return data;
}
export function mensagem(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
