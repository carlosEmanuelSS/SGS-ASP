import type { Cadastro } from "../../api";
export const vazio: Cadastro = {
  nome: "",
  data_nascimento: "",
  cpf: "",
  matricula_escolar: "",
  responsavel: "",
  parentesco: "",
  telefone: "",
  renda_familiar: "",
  programas_sociais: false,
  observacoes: "",
};
export const campos: {
  key: Exclude<keyof Cadastro, "programas_sociais">;
  label: string;
  type?: string;
  required?: boolean;
  max?: number;
}[] = [
  { key: "nome", label: "Nome completo do aluno", required: true, max: 160 },
  {
    key: "data_nascimento",
    label: "Data de nascimento",
    type: "date",
    required: true,
  },
  { key: "cpf", label: "CPF (opcional)", max: 14 },
  { key: "matricula_escolar", label: "Matrícula escolar (opcional)", max: 80 },
  {
    key: "responsavel",
    label: "Nome do responsável",
    required: true,
    max: 160,
  },
  {
    key: "parentesco",
    label: "Parentesco ou vínculo",
    required: true,
    max: 60,
  },
  {
    key: "telefone",
    label: "Telefone com DDD",
    type: "tel",
    required: true,
    max: 20,
  },
  {
    key: "renda_familiar",
    label: "Renda familiar mensal em R$ (opcional)",
    type: "number",
  },
  { key: "observacoes", label: "Observações cadastrais (opcional)", max: 2000 },
];
export const labels: Record<string, string> = Object.fromEntries(
  campos.map((c) => [c.key, c.label]),
);
Object.assign(labels, {
  programas_sociais: "Programas sociais",
  status: "Situação",
});
export const dataLocal = (value: string) =>
  new Date(value).toLocaleString("pt-BR");
export const nascimento = (value: string) =>
  value.split("-").reverse().join("/");
