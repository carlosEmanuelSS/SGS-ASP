import type { IconName } from "../../Icon";

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
export const horario = (o: Pick<DadosOficina, "inicio" | "fim">) =>
  `${o.inicio.slice(0, 5)} às ${o.fim.slice(0, 5)}`;

/** Ícone temático pela área ou nome da oficina. */
export function iconeOficina(o: { nome: string; tipo?: string }): IconName {
  const texto = `${o.nome} ${o.tipo ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/robo|tecnolog|informatic|program|computa/.test(texto)) return "cpu";
  if (/music|violao|coral|canto|percuss/.test(texto)) return "music";
  if (/esport|futebol|volei|basquet|judo|capoeira|natac/.test(texto))
    return "trophy";
  if (/arte|teatro|pintur|desenho|artesan|danca/.test(texto)) return "palette";
  if (/ingles|idioma|espanhol|libras|leitura|reforco/.test(texto))
    return "book";
  return "school";
}

/** "Turma A" sem repetir a palavra quando o nome já começa com "Turma". */
export const rotuloTurma = (turma: string) =>
  /^turma\b/i.test(turma.trim()) ? turma : `Turma ${turma}`;
