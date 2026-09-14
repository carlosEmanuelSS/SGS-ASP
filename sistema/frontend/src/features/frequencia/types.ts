export type Turma = {
  id: string;
  nome: string;
  turma: string;
  unidade: string;
  ativa: boolean;
  dias_semana: number[];
  inicio: string;
  fim: string;
};
export type Registro = {
  matricula_id: string;
  nome: string;
  presente: boolean | null;
  justificativa: string;
};
export type Marcacao = { presente: boolean; justificativa: string };
export type Chamada = {
  id: string | null;
  oficina: Turma;
  data: string;
  versao: number;
  registros: Registro[];
  historico: {
    versao: number;
    autor: string;
    motivo: string;
    criado_em: string;
    alteracoes: { nome: string; antes: Marcacao | null; depois: Marcacao }[];
  }[];
};
export type Resumo = {
  data: string;
  versao: number;
  total: number;
  presentes: number;
  faltas: number;
};
export type Acessos = {
  usuarios: number[];
  opcoes: { id: number; nome: string; usuario: string; disponivel: boolean }[];
};
export function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
