export type Resumo = {
  inicio: string;
  fim: string;
  gerado_em: string;
  alunos: {
    total: number;
    ativos: number;
    espera: number;
    inativos: number;
    espera_30_dias: number;
  };
  ocupacao: {
    id: string;
    nome: string;
    turma: string;
    unidade: string;
    educador: string;
    vagas: number;
    ocupadas: number;
  }[];
  frequencia: {
    total: number;
    presentes: number;
    faltas: number;
    percentual: number | null;
  };
  semanas: { inicio: string; total: number; presentes: number }[];
  por_turma: {
    id: string;
    nome: string;
    turma: string;
    educador: string;
    aulas: number;
    total: number;
    presentes: number;
  }[];
  alertas: { aluno: string; nome: string; faltas: number; aulas: number }[];
  faixas: Record<string, number>;
  atendimentos: { tipo: string; total: number }[];
  doacoes: { total: number; valor: string | number } | null;
};

/** Data local no formato AAAA-MM-DD. */
export function isoLocal(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return isoLocal(d);
}

export const percentual = (parte: number, total: number) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

export const diaMes = (iso: string) =>
  iso.slice(0, 10).split("-").reverse().slice(0, 2).join("/");
