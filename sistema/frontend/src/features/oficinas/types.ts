export const dias = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
export type DadosOficina = {
  nome: string;
  turma: string;
  tipo: string;
  educador: string;
  unidade: string;
  dias_semana: number[];
  inicio: string;
  fim: string;
  limite_vagas: number;
  descricao: string;
  ativa: boolean;
};
export type Oficina = DadosOficina & {
  id: string;
  versao: number;
  ocupadas: number;
  disponiveis: number;
};
export type Matricula = {
  id: string;
  aluno_id: string;
  nome: string;
  data_nascimento: string;
  ativa: boolean;
  criado_em: string;
  cancelado_em: string | null;
};
export type DetalheOficina = Oficina & {
  matriculas: Matricula[];
  historico: {
    acao: string;
    motivo: string;
    usuario: string;
    aluno: string;
    criado_em: string;
  }[];
};
export type Pagina<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};
export type Candidato = { id: string; nome: string; data_nascimento: string };
export const horario = (o: DadosOficina) =>
  `${o.inicio.slice(0, 5)} às ${o.fim.slice(0, 5)}`;
